import React, { JSX, useCallback, useEffect, useRef, useState } from 'react'

export interface PlayerInput {
    src?: string
    audioRef: React.RefObject<HTMLAudioElement | null>
    /** True while the main process is fetching the track (no preview — full file only). */
    downloading?: boolean
    /** If true, do not reset to 0s or autoplay on src change (LAN listener: parent syncs time). */
    skipAutostart?: boolean
    /** If true, play/pause and seek are driven by the host; local controls are disabled. */
    remoteControlled?: boolean
    /** When remote-controlled, scrubber / play icon follow the host (avoids element time glitches at pause/end). */
    remoteScrubberTimeSec?: number | null
    remoteScrubberPlaying?: boolean | null
}

function clamp(n: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, n))
}

function Player(props: PlayerInput): JSX.Element {
    const {
        src,
        audioRef,
        downloading,
        skipAutostart,
        remoteControlled,
        remoteScrubberTimeSec,
        remoteScrubberPlaying,
    } = props
    const scrubberRef = useRef<HTMLDivElement>(null)
    const scrubbingRef = useRef(false)
    const [duration, setDuration] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [playing, setPlaying] = useState(false)

    useEffect(() => {
        scrubbingRef.current = false
        if (skipAutostart) return
        setDuration(0)
        setCurrentTime(0)
    }, [src, skipAutostart])

    const seekFromClientX = useCallback((clientX: number) => {
        const bar = scrubberRef.current
        const el = audioRef.current
        if (!bar || !el) return
        const d = el.duration
        if (!Number.isFinite(d) || d <= 0) return
        const rect = bar.getBoundingClientRect()
        const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
        el.currentTime = ratio * d
        setCurrentTime(el.currentTime)
    }, [audioRef])

    useEffect(() => {
        if (!src || skipAutostart) return
        const el = audioRef.current
        if (!el) return

        let done = false
        const startFromBeginning = () => {
            if (done) return
            done = true
            el.currentTime = 0
            setCurrentTime(0)
            void el.play().catch(() => {
                /* autoplay policies may block */
            })
        }

        el.addEventListener('loadedmetadata', startFromBeginning, { once: true })
        const tick = () => {
            if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
                startFromBeginning()
            }
        }
        queueMicrotask(tick)
        const raf = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(raf)
            el.removeEventListener('loadedmetadata', startFromBeginning)
        }
    }, [src, audioRef, skipAutostart])

    useEffect(() => {
        const el = audioRef.current
        if (!el) return

        const onTimeUpdate = () => {
            if (scrubbingRef.current) return
            if (
                remoteControlled &&
                remoteScrubberTimeSec != null &&
                Number.isFinite(remoteScrubberTimeSec)
            ) {
                return
            }
            setCurrentTime(el.currentTime)
        }
        const onDurationChange = () => {
            if (Number.isFinite(el.duration)) setDuration(el.duration)
        }
        const onPlay = () => setPlaying(true)
        const onPause = () => setPlaying(false)
        const onEnded = () => setPlaying(false)

        el.addEventListener('timeupdate', onTimeUpdate)
        el.addEventListener('durationchange', onDurationChange)
        el.addEventListener('loadedmetadata', onDurationChange)
        el.addEventListener('play', onPlay)
        el.addEventListener('pause', onPause)
        el.addEventListener('ended', onEnded)
        onDurationChange()
        setPlaying(!el.paused)

        return () => {
            el.removeEventListener('timeupdate', onTimeUpdate)
            el.removeEventListener('durationchange', onDurationChange)
            el.removeEventListener('loadedmetadata', onDurationChange)
            el.removeEventListener('play', onPlay)
            el.removeEventListener('pause', onPause)
            el.removeEventListener('ended', onEnded)
        }
    }, [src, audioRef, remoteControlled, remoteScrubberTimeSec])

    const displayTimeSec =
        remoteControlled &&
        remoteScrubberTimeSec != null &&
        Number.isFinite(remoteScrubberTimeSec)
            ? remoteScrubberTimeSec
            : currentTime

    const playingUi =
        remoteControlled && remoteScrubberPlaying != null ? remoteScrubberPlaying : playing

    const onScrubberPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (remoteControlled || !src || !audioRef.current) return
        e.currentTarget.setPointerCapture(e.pointerId)
        scrubbingRef.current = true
        seekFromClientX(e.clientX)
    }

    const onScrubberPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!scrubbingRef.current) return
        seekFromClientX(e.clientX)
    }

    const onScrubberPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId)
        }
        scrubbingRef.current = false
    }

    const togglePlay = () => {
        if (remoteControlled) return
        const el = audioRef.current
        if (!el) return
        if (el.paused) void el.play().catch(() => {})
        else el.pause()
    }

    const progress =
        duration > 0 && Number.isFinite(duration)
            ? clamp(displayTimeSec / duration, 0, 1)
            : 0

    return (
        <div id="player" className='bg-[#353535] min-h-[10vh] flex flex-col gap-3 justify-center items-center px-6'>
            <div className='h-1' />
            {downloading && !src ? (
                <p className="text-stone-400 text-sm self-start">Downloading audio…</p>
            ) : null}
            <div
                id="scrubber"
                ref={scrubberRef}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration) || 0}
                aria-valuenow={Math.round(displayTimeSec)}
                aria-label="Seek"
                className={`relative w-full h-2 rounded-full bg-stone-600 touch-none ${
                    remoteControlled
                        ? 'cursor-default opacity-50 pointer-events-none'
                        : src
                          ? 'cursor-pointer'
                          : 'cursor-default opacity-60'
                }`}
                onPointerDown={onScrubberPointerDown}
                onPointerMove={onScrubberPointerMove}
                onPointerUp={onScrubberPointerUp}
                onPointerCancel={onScrubberPointerUp}
            >
                <div
                    className="absolute inset-y-0 left-0 rounded-full bg-stone-300 pointer-events-none"
                    style={{ width: `${progress * 100}%` }}
                />
            </div>
            <div id="controls" className='h-auto flex items-center gap-3'>

                <svg width={20} height={20} fill='#b3b3b3'>
                    <path 
                        d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.575a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7z"
                         transform="scale(1.2)"></path>
                </svg>

                <button
                    type="button"
                    onClick={togglePlay}
                    disabled={!src || remoteControlled}
                    aria-label={playingUi ? 'Pause' : 'Play'}
                    title={remoteControlled ? 'Controlled by the broadcaster' : undefined}
                    className="p-0 border-0 bg-transparent cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" width="30" height="30">
                        <circle cx="15" cy="15" r="15" fill="white" strokeWidth="2" />
                        {playingUi ? (
                            <>
                                <rect x="10" y="9" width="3.5" height="12" rx="0.5" fill="black" />
                                <rect x="16.5" y="9" width="3.5" height="12" rx="0.5" fill="black" />
                            </>
                        ) : (
                            <polygon points="11,9 11,21 22.5,15" fill="black" />
                        )}
                    </svg>
                </button>

                <svg width={20} height={20} fill='#b3b3b3'>
                    <path 
                        d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7z"
                        transform='scale(1.2)'></path>
                </svg>
                {src ? (
                    <audio
                        ref={audioRef}
                        autoPlay={!skipAutostart}
                        hidden
                        src={src}
                    />
                ) : null}
            </div>
        </div>
    )
}

export default Player
