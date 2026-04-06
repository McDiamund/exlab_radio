import React, { useCallback, useEffect, useState } from 'react'

export type LanStreamInfo = {
    app: 'exlab-radio'
    schemaVersion: 2
    title: string
    artist: string
    description: string
    coverUrl: string | null
    streamUrl: string
    contentType: string | null
    contentLength: number | null
    hasAudio: boolean
    playbackRevision: number
    positionSec: number
    playing: boolean
}

export type LanStreamHit = { address: string; info: LanStreamInfo }

type Props = {
    onTuneIn: (hit: LanStreamHit) => void | Promise<void>
}

const DEFAULT_PORT = 47890

export default function NetworkStreamPanel(props: Props) {
    const { onTuneIn } = props
    const [open, setOpen] = useState(false)
    const [port, setPort] = useState(DEFAULT_PORT)
    const [listening, setListening] = useState(false)
    const [activePort, setActivePort] = useState(0)
    const [addresses, setAddresses] = useState<string[]>([])
    const [lanUrls, setLanUrls] = useState<string[]>([])
    const [busy, setBusy] = useState(false)
    const [scanBusy, setScanBusy] = useState(false)
    const [scanHits, setScanHits] = useState<LanStreamHit[]>([])
    const [lastError, setLastError] = useState<string | null>(null)

    const refreshStatus = useCallback(() => {
        return window.api
            .networkBroadcastStatus()
            .then((s) => {
                setListening(s.listening)
                setActivePort(s.port)
                setAddresses(s.addresses)
            })
            .catch(() => {
                setListening(false)
                setActivePort(0)
                setAddresses([])
            })
    }, [])

    useEffect(() => {
        void refreshStatus()
    }, [refreshStatus])

    const toggleBroadcast = async () => {
        setLastError(null)
        setBusy(true)
        try {
            if (listening) {
                await window.api.networkBroadcastStop()
                setLanUrls([])
            } else {
                const p = Number(port)
                if (!Number.isFinite(p) || p < 1024 || p > 65535) {
                    setLastError('Use a port between 1024 and 65535.')
                    return
                }
                const res = await window.api.networkBroadcastStart(p)
                if (!res.ok) {
                    setLastError(res.error)
                    return
                }
                setActivePort(res.port)
                setLanUrls(res.lanBaseUrls)
            }
            await refreshStatus()
        } catch (e) {
            setLastError(e instanceof Error ? e.message : String(e))
        } finally {
            setBusy(false)
        }
    }

    const scan = async () => {
        setLastError(null)
        setScanBusy(true)
        setScanHits([])
        try {
            const p = Number(port)
            if (!Number.isFinite(p) || p < 1 || p > 65535) {
                setLastError('Invalid port for scan.')
                return
            }
            const res = await window.api.networkBroadcastScan(p)
            setScanHits(
                res.streams.map((s) => ({
                    address: s.address,
                    info: s.info as LanStreamInfo,
                })),
            )
        } catch (e) {
            setLastError(e instanceof Error ? e.message : String(e))
        } finally {
            setScanBusy(false)
        }
    }

    return (
        <div className="text-stone-200 text-xs border-t border-stone-600 pt-2 mt-2">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="text-stone-400 hover:text-white underline-offset-2 hover:underline w-full text-left"
            >
                {open ? '▼' : '▶'} Network stream (LAN)
            </button>
            {open && (
                <div className="mt-2 flex flex-col gap-3">
                    <p className="text-stone-400 leading-snug">
                        Share what you are playing with other copies of EXLAB Radio on your network, or
                        scan for nearby broadcasters. Uses the same port for serving and discovery.
                    </p>
                    <label className="flex flex-col gap-1">
                        <span className="text-stone-500">Port</span>
                        <input
                            type="number"
                            min={1024}
                            max={65535}
                            value={port}
                            disabled={listening || busy}
                            onChange={(e) => setPort(Number(e.target.value))}
                            className="max-w-[8rem] rounded bg-black/40 px-2 py-1 text-stone-200 border border-stone-600"
                        />
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void toggleBroadcast()}
                            className="bg-[#77933c] text-white px-3 py-1.5 rounded disabled:opacity-45"
                        >
                            {listening ? 'Stop broadcasting' : 'Start broadcasting'}
                        </button>
                        <button
                            type="button"
                            disabled={scanBusy}
                            onClick={() => void scan()}
                            className="bg-stone-700 text-white px-3 py-1.5 rounded hover:bg-stone-600 disabled:opacity-45"
                        >
                            {scanBusy ? 'Scanning LAN…' : 'Scan for streams'}
                        </button>
                    </div>
                    {listening && activePort > 0 ? (
                        <div className="flex flex-col gap-1 text-[11px]">
                            <span className="text-[#8fbc5c]">Broadcasting on port {activePort}</span>
                            {lanUrls.length > 0 ? (
                                <ul className="list-none flex flex-col gap-0.5 text-stone-400 break-all">
                                    {lanUrls.map((u) => (
                                        <li key={u}>
                                            <code className="text-stone-300">{u}</code>
                                        </li>
                                    ))}
                                </ul>
                            ) : addresses.length > 0 ? (
                                <ul className="list-none flex flex-col gap-0.5 text-stone-400 break-all">
                                    {addresses.map((ip) => (
                                        <li key={ip}>
                                            <code className="text-stone-300">
                                                http://{ip}:{activePort}
                                            </code>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <span className="text-stone-500">
                                    Other devices can open{' '}
                                    <code className="text-stone-400">
                                        http://&lt;this-computer-ip&gt;:{activePort}/exlab-radio/info
                                    </code>
                                </span>
                            )}
                        </div>
                    ) : null}
                    {scanHits.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            <span className="text-stone-500">Found on LAN</span>
                            <ul className="list-none flex flex-col gap-2 max-h-40 overflow-y-auto">
                                {scanHits.map((hit) => (
                                    <li
                                        key={`${hit.address}-${hit.info.streamUrl}`}
                                        className="rounded border border-stone-600 bg-black/20 p-2 flex flex-col gap-1"
                                    >
                                        <div className="flex gap-2 items-start">
                                            <div
                                                className="w-10 h-10 shrink-0 rounded bg-stone-800 bg-cover bg-center"
                                                style={
                                                    hit.info.coverUrl
                                                        ? {
                                                              backgroundImage: `url(${hit.info.coverUrl})`,
                                                          }
                                                        : undefined
                                                }
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-stone-200 truncate text-sm">
                                                    {hit.info.title || 'Unknown title'}
                                                </p>
                                                <p className="text-stone-400 truncate text-[11px]">
                                                    {hit.info.artist || 'Unknown artist'}
                                                </p>
                                                <p className="text-stone-500 text-[10px]">
                                                    {hit.address}
                                                    {!hit.info.hasAudio ? ' · no audio yet' : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={!hit.info.hasAudio}
                                            onClick={() => void onTuneIn(hit)}
                                            className="self-start text-[11px] px-2 py-1 rounded bg-[#77933c] text-white disabled:opacity-40"
                                        >
                                            Play in EXLAB Radio
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                    {lastError ? (
                        <p className="text-amber-400/90 text-[11px]">{lastError}</p>
                    ) : null}
                </div>
            )}
        </div>
    )
}
