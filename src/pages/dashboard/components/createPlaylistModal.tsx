import React, { JSX, useCallback, useState } from 'react'
import type { DeezerTrack } from '../../../contexts/SongContext'

export type LocalPlaylist = {
    id: string
    name: string
    description: string
    createdAt: string
    coverUrl: string | null
    tracks: DeezerTrack[]
}

type Props = {
    open: boolean
    onClose: () => void
    onCreated: (playlist: LocalPlaylist) => void
}

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const r = reader.result
            if (typeof r === 'string') resolve(r)
            else reject(new Error('Could not read image'))
        }
        reader.onerror = () => reject(reader.error ?? new Error('Read failed'))
        reader.readAsDataURL(file)
    })
}

export default function CreatePlaylistModal({
    open,
    onClose,
    onCreated,
}: Props): JSX.Element | null {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null)
    const [coverPreview, setCoverPreview] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    const reset = useCallback(() => {
        setName('')
        setDescription('')
        setCoverDataUrl(null)
        setCoverPreview(null)
    }, [])

    const handleClose = () => {
        if (saving) return
        reset()
        onClose()
    }

    const onPickCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file || !file.type.startsWith('image/')) return
        try {
            const dataUrl = await readFileAsDataUrl(file)
            setCoverDataUrl(dataUrl)
            setCoverPreview(dataUrl)
        } catch {
            alert('Could not load that image.')
        }
    }

    const clearCover = () => {
        setCoverDataUrl(null)
        setCoverPreview(null)
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) {
            alert('Please enter a playlist name.')
            return
        }
        setSaving(true)
        try {
            const created = await window.api.playlistsAdd({
                name: trimmed,
                description: description.trim(),
                coverDataUrl,
            })
            onCreated(created)
            reset()
            onClose()
        } catch (err) {
            alert(err instanceof Error ? err.message : String(err))
        } finally {
            setSaving(false)
        }
    }

    if (!open) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-5"
            style={{ background: 'rgba(0,0,0,0.65)' }}
            role="presentation"
            onMouseDown={(ev) => {
                if (ev.target === ev.currentTarget) handleClose()
            }}
        >
            <form
                onSubmit={submit}
                className="w-full max-w-md bg-[#2a2a2a] p-5 shadow-xl"
                onMouseDown={(ev) => ev.stopPropagation()}
            >
                <h2 className="mb-4 text-md tracking-widest text-white">CREATE PLAYLIST</h2>

                <label className="mb-3 block text-sm text-stone-300">
                    Name
                    <input
                        className="mt-1 w-full bg-[#1a1a1a] px-3 py-2 text-white outline-none focus:border-[#77933c]"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="My playlist"
                        autoFocus
                        disabled={saving}
                    />
                </label>

                <label className="mb-3 block text-sm text-stone-300">
                    Description{' '}
                    <span className="text-stone-500">(optional)</span>
                    <textarea
                        className="mt-1 min-h-[72px] w-full resize-y bg-[#1a1a1a] px-3 py-2 text-white outline-none focus:border-[#77933c]"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Notes about this playlist"
                        disabled={saving}
                    />
                </label>

                <div className="mb-4">
                    <p className="mb-2 text-sm text-stone-300">
                        Cover image <span className="text-stone-500">(optional)</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="cursor-pointer  bg-stone-700 px-3 py-2 text-sm text-white hover:bg-stone-600">
                            Choose image
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={onPickCover}
                                disabled={saving}
                            />
                        </label>
                        {coverPreview ? (
                            <>
                                <button
                                    type="button"
                                    className=" px-3 py-2 text-sm text-stone-400 hover:text-white"
                                    onClick={clearCover}
                                    disabled={saving}
                                >
                                    Remove
                                </button>
                                <div
                                    className="h-16 w-16 shrink-0 border border-stone-600 bg-black bg-cover bg-center"
                                    style={{ backgroundImage: `url(${coverPreview})` }}
                                />
                            </>
                        ) : null}
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-stone-700 pt-4">
                    <button
                        type="button"
                        className="rounded px-4 py-2 text-sm text-stone-300 hover:bg-stone-800"
                        onClick={handleClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className=" bg-[#77933c] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                        disabled={saving}
                    >
                        {saving ? 'Saving…' : 'Create'}
                    </button>
                </div>
            </form>
        </div>
    )
}
