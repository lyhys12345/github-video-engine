param([Parameter(Mandatory=$true)][string]$InputFile)
$ErrorActionPreference = 'Stop'
# Trusted engine script. Text is always plain data, never XML or PowerShell source.
$inputData = Get-Content -LiteralPath $InputFile -Raw -Encoding utf8 | ConvertFrom-Json
$voice = New-Object -ComObject SAPI.SpVoice
$selected = @($voice.GetVoices() | Where-Object { $_.Id -eq $inputData.voiceId })
if ($selected.Count -ne 1) { throw 'Requested installed SAPI voice was not found' }
$voice.Voice = $selected[0]
$voice.Rate = 0
$voice.Volume = 100
foreach ($line in $inputData.lines) {
  $stream = New-Object -ComObject SAPI.SpFileStream
  try {
    $stream.Format.Type = 22
    $stream.Open([string]$line.output, 3, $false)
    $voice.AudioOutputStream = $stream
    [void]$voice.Speak([string]$line.text,16)
  } finally { $stream.Close() }
}
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($voice) | Out-Null
