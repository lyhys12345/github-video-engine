# Local Windows WinRT Chinese synthesis probe

Performed locally without a reference recording, paid service, registry modification, repository changes or an explicit network call. This probes this host only; it does not prove suitability, naturalness, identity, similarity to Chen, rights, or behavior on other devices. I did not listen to the output. Network packet capture was not performed.

## Voices returned by WinRT

`SpeechSynthesizer.AllVoices` returned:

| Display name | Language | ID |
|---|---|---|
| Microsoft Huihui | zh-CN | `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens\MSTTS_V110_zhCN_HuihuiM` |
| Microsoft Yaoyao | zh-CN | `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens\MSTTS_V110_zhCN_YaoyaoM` |
| Microsoft Kangkang | zh-CN | `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech_OneCore\Voices\Tokens\MSTTS_V110_zhCN_KangkangM` |

Enumeration does not verify synthesis for Yaoyao or Kangkang. The selected actual voice was Huihui. The generic test text was `这是一个中文语音测试。我们正在检查离线合成。` The retained `synthesize.ps1` selects it by language/name, calls local `SynthesizeTextToStreamAsync` twice and writes returned streams as separate WAVs. Run with `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\synthesize.ps1`. It uses the installed voice with its default synthesis settings. The first attempt at running an unmarked UTF-8 script under Windows PowerShell failed to parse the Chinese; saving the same script with a UTF-8 BOM fixed this before synthesis.

## Actual output and checks

Both `huihui-1.wav` and `huihui-2.wav` are 197,166 bytes. `ffprobe -v error -show_entries format=duration:stream=codec_name,codec_type,sample_rate,channels,bits_per_sample -of json <file>` reports PCM signed 16-bit little-endian, 16,000 Hz, mono, duration 6.160 seconds for each. `ffmpeg -v error -xerror -i <file> -f null -` fully decoded both with exit 0. `ffmpeg -hide_banner -nostats -i <file> -af volumedetect -f null -` reported mean -26.1 dBFS and maximum -6.2 dBFS for each. Nonzero measured audio does not prove intelligible or correct spoken words.

| Run | WAV SHA-256 | Decoded PCM SHA-256 |
|---|---|---|
| 1 | `65e7166e1f753b4d1bbe0a26db45e87c6ba246bb12ac66a337493819d5be39df` | `e24d811cccbb4db3bf1c7be9aaca22de6cd4f6065844bde569957682c0e43799` |
| 2 | `26062b8bb749ea45b08dde2177943521146a2d647ac8d34e620fecb89c1fa6a5` | `0a88c7e9adf8e02c9475d035f89f017ab8e4eee984b7d0eedf0b7125acd3c35c` |

WAV hashes obtained with `Get-FileHash -Algorithm SHA256`. Decoded PCM hashes obtained with `ffmpeg -v error -i <file> -map 0:a:0 -c:a pcm_s16le -f hash -hash sha256 -`. The same input and selected voice produced files with equal lengths and coarse measured levels but different WAV and decoded PCM bytes. No byte-determinism guarantee can be inferred, and the cause of differences was not investigated.
