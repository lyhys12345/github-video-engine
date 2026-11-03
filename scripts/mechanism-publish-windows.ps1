$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public static class MechanismPublication
{
    [StructLayout(LayoutKind.Sequential)]
    private struct UnicodeString { public ushort Length, Capacity; public IntPtr Buffer; }
    [StructLayout(LayoutKind.Sequential)]
    private struct ObjectAttributes
    {
        public int Length;
        public IntPtr Root, Name;
        public uint Flags;
        public IntPtr Security, Quality;
    }
    [StructLayout(LayoutKind.Sequential)]
    private struct IoStatus { public IntPtr Status, Information; }
    [StructLayout(LayoutKind.Sequential)]
    private struct FileTag { public uint Attributes, Tag; }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern SafeFileHandle CreateFile(string name, uint access, uint share,
        IntPtr security, uint disposition, uint flags, IntPtr template);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetFileInformationByHandleEx(SafeFileHandle handle, int informationClass,
        out FileTag info, uint length);
    [DllImport("ntdll.dll")]
    private static extern int NtCreateFile(out SafeFileHandle file, uint access, ref ObjectAttributes attributes,
        out IoStatus status, IntPtr size, uint fileAttributes, uint share, uint disposition,
        uint options, IntPtr extendedAttributes, uint extendedLength);
    [DllImport("ntdll.dll")]
    private static extern uint RtlNtStatusToDosError(int status);

    private const uint ReadDirectoryAndSync = 0x100081; // FILE_LIST_DIRECTORY activates share checks.
    private const uint WriteAndSync = 0x100002;
    private const uint ShareReadOnly = 1;
    private const uint OpenExisting = 1;
    private const uint CreateNew = 2;

    // Paths below the drive root are opened one component at a time relative to the checked parent.
    // The retained handles disallow other writers and renames. Newly created directories are
    // returned already locked, so no pathname is ever reopened after an unprotected mkdir.
    private static SafeFileHandle Relative(SafeFileHandle parent, string component, bool directory, bool create)
    {
        IntPtr text = Marshal.StringToHGlobalUni(component);
        IntPtr name = IntPtr.Zero;
        try
        {
            var str = new UnicodeString { Length = (ushort)(component.Length * 2),
                Capacity = (ushort)((component.Length + 1) * 2), Buffer = text };
            name = Marshal.AllocHGlobal(Marshal.SizeOf(typeof(UnicodeString)));
            Marshal.StructureToPtr(str, name, false);
            var attributes = new ObjectAttributes { Length = Marshal.SizeOf(typeof(ObjectAttributes)),
                Root = parent.DangerousGetHandle(), Name = name, Flags = 0x40 }; // OBJ_CASE_INSENSITIVE
            IoStatus io;
            SafeFileHandle handle;
            const uint OpenReparsePoint = 0x200000;
            const uint SynchronousIo = 0x20;
            uint type = directory ? 1u : 0x40u; // FILE_DIRECTORY_FILE or FILE_NON_DIRECTORY_FILE
            int status = NtCreateFile(out handle, directory ? ReadDirectoryAndSync : WriteAndSync,
                ref attributes, out io, IntPtr.Zero, 0, ShareReadOnly, create ? CreateNew : OpenExisting,
                type | OpenReparsePoint | SynchronousIo, IntPtr.Zero, 0);
            if (status < 0)
            {
                if (handle != null) handle.Dispose();
                throw new Win32Exception((int)RtlNtStatusToDosError(status), "Cannot reserve/open publication component: " + component);
            }
            return handle;
        }
        finally
        {
            if (name != IntPtr.Zero) Marshal.FreeHGlobal(name);
            Marshal.FreeHGlobal(text);
        }
    }

    private static void RequirePlainDirectory(SafeFileHandle handle)
    {
        FileTag info;
        if (!GetFileInformationByHandleEx(handle, 9, out info, (uint)Marshal.SizeOf(typeof(FileTag))))
            throw new Win32Exception(Marshal.GetLastWin32Error());
        if ((info.Attributes & 0x410) != 0x10)
            throw new IOException("Publication requires ordinary directories; reparse points are forbidden.");
    }

    private static void RequireComponent(string part)
    {
        if (part.Length == 0 || part.Length > 255 || part.EndsWith(".") || part.EndsWith(" ")
            || part.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
            throw new IOException("Invalid publication path component.");
    }

    public static void Publish(string output, bool directory, string[] names, string[] payloads)
    {
        string root = Path.GetPathRoot(output);
        if (root == null || root.Length != 3 || root[1] != ':' || root[2] != (char)92)
            throw new IOException("Publication requires an absolute local drive path.");
        string[] parts = output.Substring(root.Length).Split((char)92);
        foreach (string part in parts) RequireComponent(part);
        foreach (string name in names) RequireComponent(name);
        var handles = new List<SafeFileHandle>();
        try
        {
            // FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT
            SafeFileHandle parent = CreateFile(root, ReadDirectoryAndSync, ShareReadOnly,
                IntPtr.Zero, 3, 0x2200000, IntPtr.Zero);
            if (parent.IsInvalid)
            {
                int error = Marshal.GetLastWin32Error();
                parent.Dispose();
                throw new Win32Exception(error);
            }
            handles.Add(parent);
            RequirePlainDirectory(parent);
            int folders = directory ? parts.Length : parts.Length - 1;
            for (int i = 0; i < folders; i++)
            {
                parent = Relative(parent, parts[i], true, directory && i == parts.Length - 1);
                handles.Add(parent);
                RequirePlainDirectory(parent);
            }
            for (int i = 0; i < names.Length; i++)
            {
                byte[] bytes = Convert.FromBase64String(payloads[i]);
                using (SafeFileHandle file = Relative(parent, directory ? names[i] : parts[parts.Length - 1], false, true))
                using (var stream = new FileStream(file, FileAccess.Write))
                    stream.Write(bytes, 0, bytes.Length);
            }
        }
        finally
        {
            for (int i = handles.Count - 1; i >= 0; i--) handles[i].Dispose();
        }
    }
}
'@

[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false, $true)
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
[MechanismPublication]::Publish($request.output, $request.directory, [string[]]$request.names, [string[]]$request.payloads)
