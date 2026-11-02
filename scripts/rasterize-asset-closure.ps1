param([string]$ActualRoot='work/asset-closure-v1/actual',[string]$Output='work/asset-closure-v1/png')
$ErrorActionPreference='Stop'
$base=(Resolve-Path -LiteralPath $ActualRoot).Path
$out=[System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Output))
if(Test-Path -LiteralPath $out){throw 'PNG output must be a new directory'}
New-Item -ItemType Directory -Path $out | Out-Null
$edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
$version=(Get-Item -LiteralPath $edge).VersionInfo.ProductVersion
$profile=Join-Path $out '.owned-edge-profile'
$records=@()
foreach($case in @(@{name='rea';shot='shot-7'},@{name='rembg';shot='shot-5'},@{name='synthetic';shot='synthetic-shot'})){
 foreach($phase in @('early','middle','late')){
  $source=Join-Path $base ($case.name+'/bundle/frames/'+$case.shot+'-'+$phase+'.svg')
  $target=Join-Path $out ($case.name+'-'+$phase+'.png')
  $url=([uri]$source).AbsoluteUri
  $flags=@('--headless=new','--no-sandbox','--disable-gpu','--hide-scrollbars','--force-device-scale-factor=1',"--user-data-dir=$profile","--screenshot=$target",'--window-size=720,1280',$url)
  Start-Process -FilePath $edge -ArgumentList $flags -Wait -WindowStyle Hidden
  if(!(Test-Path -LiteralPath $target)){throw "Missing raster $target"}
  $records+=@{case=$case.name;phase=$phase;svg=$source;svgSha256=(Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant();png=$target;pngSha256=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant();bytes=(Get-Item -LiteralPath $target).Length;tool='Microsoft Edge headless';toolVersion=$version;viewport='720x1280';flags=$flags}
 }
}
@{schemaVersion='1.0';scope='exact exported SVG to PNG diagnostic review evidence; not video';records=$records}|ConvertTo-Json -Depth 8|Set-Content -Encoding utf8 (Join-Path $out 'raster-manifest.json')
