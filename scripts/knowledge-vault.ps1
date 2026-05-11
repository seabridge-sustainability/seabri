param(
  [Parameter(Mandatory=$true, Position=0)]
  [ValidateSet("validate", "normalize")]
  [string]$Command,

  [Parameter(Mandatory=$true, Position=1)]
  [string]$Target,

  [Parameter(ValueFromRemainingArguments=$true)]
  [string[]]$Args
)

$tool = "C:\Users\adelm\SeaBridgeAI\SeaBridgeAI\tools\knowledge\vaultsafe.py"
if (-not (Test-Path -LiteralPath $tool)) {
  throw "Central knowledge vault tool not found: $tool"
}

python $tool $Command $Target @Args
