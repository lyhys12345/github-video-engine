$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$request = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'request.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
$voiceId = 'HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens\MSTTS_V110_zhCN_HuihuiM'
if ($request.voiceId -cne $voiceId -or $request.language -cne 'zh-CN' -or $request.text -isnot [string]) {
    throw 'Invalid fixed WinRT request.'
}
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType=WindowsRuntime]
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesisStream, Windows.Media.SpeechSynthesis, ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType=WindowsRuntime]
$selected = @([Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object {
    $_.Id -ceq $voiceId -and $_.Language -ceq 'zh-CN'
})
if ($selected.Count -ne 1) { throw 'HUIHUI_VOICE_UNAVAILABLE' }
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
$synth = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::new()
try {
    $synth.Voice = $selected[0]
    $operation = $synth.SynthesizeTextToStreamAsync($request.text)
    $task = $asTask.MakeGenericMethod([Windows.Media.SpeechSynthesis.SpeechSynthesisStream]).Invoke($null, @($operation))
    $stream = $task.GetAwaiter().GetResult()
    try {
        if ($stream.Size -le 0 -or $stream.Size -gt 2000000) { throw 'HUIHUI_WAV_LIMIT' }
        $reader = [Windows.Storage.Streams.DataReader]::new($stream.GetInputStreamAt(0))
        try {
            $load = $asTask.MakeGenericMethod([uint32]).Invoke($null, @($reader.LoadAsync([uint32]$stream.Size)))
            $count = $load.GetAwaiter().GetResult()
            if ($count -ne $stream.Size) { throw 'Incomplete WinRT stream.' }
            $bytes = New-Object byte[] $count
            $reader.ReadBytes($bytes)
            $file = [IO.File]::Open((Join-Path $PSScriptRoot 'speech.wav'), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
            try { $file.Write($bytes, 0, $count) } finally { $file.Dispose() }
        } finally { $reader.Dispose() }
    } finally { $stream.Dispose() }
    [ordered]@{voiceId = $synth.Voice.Id; language = $synth.Voice.Language} | ConvertTo-Json -Compress
} finally { $synth.Dispose() }
