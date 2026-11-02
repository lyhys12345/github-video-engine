param([Parameter(Mandatory=$true)][string]$PreviewRoot)
$ErrorActionPreference='Stop'
$base=(Resolve-Path -LiteralPath $PreviewRoot).Path
$profile=Join-Path $base '.edge-profile'
$edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
Get-ChildItem -LiteralPath $base -Recurse -Filter '*.svg' | ForEach-Object {
 $svg=$_.FullName.Replace('\','/')
 $png=[System.IO.Path]::ChangeExtension($_.FullName,'.png')
 if(!(Test-Path -LiteralPath $png)){
  Start-Process -FilePath $edge -ArgumentList @('--headless=new','--no-sandbox','--disable-gpu',"--user-data-dir=$profile", "--screenshot=$png",'--window-size=720,1280',"file:///$svg") -Wait -WindowStyle Hidden
 }
 if(!(Test-Path -LiteralPath $png)){throw "Rasterizer did not create $png"}
}
Get-ChildItem -LiteralPath $base -Directory | Where-Object {$_.Name -ne '.edge-profile'} | ForEach-Object {
 $records=Get-ChildItem -LiteralPath $_.FullName -Filter '*.png' | ForEach-Object {[pscustomobject]@{path=$_.Name;bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}}
 $records | ConvertTo-Json -Depth 3 | Set-Content -Encoding utf8 (Join-Path $_.FullName 'png-manifest.json')
}
