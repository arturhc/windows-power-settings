$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class HotKeyNative
{
    [StructLayout(LayoutKind.Sequential)]
    public struct POINT
    {
        public int X;
        public int Y;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct MSG
    {
        public IntPtr hwnd;
        public uint message;
        public UIntPtr wParam;
        public IntPtr lParam;
        public uint time;
        public POINT pt;
    }

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool UnregisterHotKey(IntPtr hWnd, int id);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int GetMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);
}
"@

$MOD_ALT = 0x1
$MOD_CONTROL = 0x2
$MOD_SHIFT = 0x4
$VK_L = 0x4C
$HOTKEY_ID = 1
$WM_HOTKEY = 0x0312

$modifiers = $MOD_ALT -bor $MOD_CONTROL -bor $MOD_SHIFT

if (-not [HotKeyNative]::RegisterHotKey([IntPtr]::Zero, $HOTKEY_ID, [uint32]$modifiers, [uint32]$VK_L)) {
    $errorCode = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
    Write-Output "ERROR:REGISTER_FAILED:$errorCode"
    exit 1
}

Write-Output "READY"

try {
    while ($true) {
        $msg = New-Object HotKeyNative+MSG
        $result = [HotKeyNative]::GetMessage([ref]$msg, [IntPtr]::Zero, 0, 0)
        if ($result -eq -1) {
            Write-Output "ERROR:GETMESSAGE_FAILED"
            break
        }
        if ($result -eq 0) {
            break
        }
        $hotkeyWParam = [uint64]$msg.wParam.ToUInt64()
        if ($msg.message -eq $WM_HOTKEY -and $hotkeyWParam -eq [uint64]$HOTKEY_ID) {
            Write-Output "HOTKEY"
        }
    }
}
finally {
    [void][HotKeyNative]::UnregisterHotKey([IntPtr]::Zero, $HOTKEY_ID)
}
