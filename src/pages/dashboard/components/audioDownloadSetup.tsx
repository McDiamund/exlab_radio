import React, { useCallback, useEffect, useState } from 'react'

type Setup = Awaited<ReturnType<typeof window.api.getYoutubeDownloadSetup>>

function statusLabel(setup: Setup | null): string {
    if (!setup) return 'Checking…'
    switch (setup.ytDlp.source) {
        case 'env_override':
            return 'Custom path (EXLAB_YT_DLP)'
        case 'system_path':
            return 'System install'
        case 'bundled_cache':
            return 'App-bundled copy (cached)'
        case 'bundled_will_download':
            return 'App will download yt-dlp on first play'
        default:
            return 'Unknown'
    }
}

function CopyRow(props: { label: string; command: string }) {
    const { label, command } = props
    const [copied, setCopied] = useState(false)

    const onCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(command)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 2000)
        } catch {
            window.alert('Could not copy to clipboard')
        }
    }, [command])

    return (
        <div className="flex flex-col gap-1">
            <span className="text-stone-400">{label}</span>
            <div className="flex gap-2 items-start">
                <code className="text-[11px] break-all flex-1 bg-black/30 rounded px-2 py-1 text-stone-200">
                    {command}
                </code>
                <button
                    type="button"
                    onClick={onCopy}
                    className="shrink-0 text-xs px-2 py-1 rounded bg-[#77933c] text-white hover:opacity-90"
                >
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
        </div>
    )
}

export default function AudioDownloadSetup(): JSX.Element {
    const [setup, setSetup] = useState<Setup | null>(null)
    const [open, setOpen] = useState(false)

    const refresh = useCallback(() => {
        window.api.getYoutubeDownloadSetup().then(setSetup).catch(() => setSetup(null))
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    return (
        <div className="text-stone-200 text-xs border-t border-stone-600 pt-2 mt-2">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="text-stone-400 hover:text-white underline-offset-2 hover:underline w-full text-left"
            >
                {open ? '▼' : '▶'} Faster downloads (optional system tools)
            </button>
            {open && (
                <div className="mt-2 flex flex-col gap-3">
                    <p className="text-stone-400 leading-snug">
                        The app works without installing anything: it can use a built-in yt-dlp. For
                        speed and fewer format issues, install yt-dlp and ffmpeg on your system —
                        the app detects them automatically. Optional: aria2 for parallel HTTP.
                    </p>
                    <ul className="flex flex-col gap-1.5 list-none">
                        <li>
                            <span className="text-stone-500">yt-dlp:</span>{' '}
                            <span className="text-stone-200">{statusLabel(setup)}</span>
                            {setup?.ytDlp.path ? (
                                <span className="block text-[10px] text-stone-500 break-all mt-0.5">
                                    {setup.ytDlp.path}
                                </span>
                            ) : null}
                        </li>
                        <li>
                            <span className="text-stone-500">ffmpeg:</span>{' '}
                            {setup?.ffmpeg.available ? (
                                <span className="text-[#8fbc5c]">found</span>
                            ) : (
                                <span className="text-amber-400/90">not on PATH (recommended)</span>
                            )}
                        </li>
                        <li>
                            <span className="text-stone-500">aria2:</span>{' '}
                            {setup?.aria2c.available ? (
                                <span className="text-[#8fbc5c]">found (used for downloads)</span>
                            ) : (
                                <span className="text-stone-500">optional</span>
                            )}
                        </li>
                    </ul>
                    {setup?.platform === 'linux' ? (
                        <p className="text-[11px] text-stone-500">
                            Linux command below targets Debian/Ubuntu (apt). On Fedora use{' '}
                            <code className="text-stone-400">dnf install yt-dlp ffmpeg aria2</code>.
                        </p>
                    ) : null}
                    {setup ? (
                        <div className="flex flex-col gap-3">
                            <CopyRow
                                label="Install yt-dlp + ffmpeg (run in Terminal / PowerShell)"
                                command={setup.installCoreCommand}
                            />
                            <CopyRow label="Optional: aria2" command={setup.installOptionalCommand} />
                        </div>
                    ) : (
                        <p className="text-stone-500 text-[11px]">Loading install commands…</p>
                    )}
                    <button
                        type="button"
                        onClick={refresh}
                        className="text-stone-500 hover:text-stone-300 text-[11px] self-start"
                    >
                        Refresh detection
                    </button>
                </div>
            )}
        </div>
    )
}
