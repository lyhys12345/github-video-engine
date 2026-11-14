param([switch]$Probe)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Speech

$recognizers = @([System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers())
if ($Probe) {
    ConvertTo-Json -InputObject @($recognizers | ForEach-Object {
        @{ id = $_.Id; locale = $_.Culture.Name; description = $_.Description }
    }) -Compress
    exit
}
$selected = $recognizers | Where-Object { $_.Culture.Name -eq $env:GVE_ALIGNMENT_LOCALE } | Sort-Object Id | Select-Object -First 1
if (-not $selected) { throw 'No installed offline desktop recognizer matches the requested locale.' }
$engine = [System.Speech.Recognition.SpeechRecognitionEngine]::new($selected)
$results = [System.Collections.Generic.List[object]]::new()
$completed = $false
$sources = @{
    SpeechRecognized = 'gve-speech-recognized'
    SpeechRecognitionRejected = 'gve-speech-rejected'
    RecognizeCompleted = 'gve-speech-completed'
}

try {
    $engine.LoadGrammar([System.Speech.Recognition.DictationGrammar]::new())
    $engine.SetInputToWaveFile($env:GVE_ALIGNMENT_PCM)
    foreach ($name in $sources.Keys) {
        Register-ObjectEvent -InputObject $engine -EventName $name -SourceIdentifier $sources[$name] | Out-Null
    }
    $engine.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)
    while (-not $completed) {
        $event = Wait-Event -Timeout 30
        if (-not $event) { throw 'The offline speech recognizer stopped producing events.' }
        Remove-Event -EventIdentifier $event.EventIdentifier
        switch ($event.SourceIdentifier) {
            'gve-speech-completed' {
                if ($event.SourceEventArgs.Error) { throw $event.SourceEventArgs.Error }
                if ($event.SourceEventArgs.Cancelled -or -not $event.SourceEventArgs.InputStreamEnded) {
                    throw 'The offline speech recognizer did not finish processing the WAV.'
                }
                $completed = $true
            }
            { $_ -in 'gve-speech-recognized', 'gve-speech-rejected' } {
                $recognition = $event.SourceEventArgs.Result
                if ($recognition -and $recognition.Audio -and $recognition.Words.Count -gt 0 -and $recognition.Text.Trim()) {
                    $words = @(
                        foreach ($word in $recognition.Words) {
                            if (-not $word.Text.Trim()) { continue }
                            $span = $recognition.GetAudioForWordRange($word, $word)
                            @{
                                text = $word.Text
                                confidence = [double]$word.Confidence
                                startSeconds = if ($span) { ($recognition.Audio.AudioPosition + $span.AudioPosition).TotalSeconds } else { $null }
                                endSeconds = if ($span) { ($recognition.Audio.AudioPosition + $span.AudioPosition + $span.Duration).TotalSeconds } else { $null }
                            }
                        }
                    )
                    $results.Add(@{
                        text = $recognition.Text
                        confidence = [double]$recognition.Confidence
                        startSeconds = $recognition.Audio.AudioPosition.TotalSeconds
                        endSeconds = ($recognition.Audio.AudioPosition + $recognition.Audio.Duration).TotalSeconds
                        rejected = $event.SourceIdentifier -eq 'gve-speech-rejected'
                        words = $words
                    })
                }
            }
        }
    }
    $json = @{
        recognizer = @{ id = $selected.Id; locale = $selected.Culture.Name; description = $selected.Description }
        engineVersion = [System.Speech.Recognition.SpeechRecognitionEngine].Assembly.FullName
        phrases = @($results.ToArray())
    } | ConvertTo-Json -Depth 8 -Compress
    [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))
}
finally {
    foreach ($source in $sources.Values) {
        Unregister-Event -SourceIdentifier $source -ErrorAction SilentlyContinue
    }
    $engine.Dispose()
}
