import { useEffect, useRef, useState } from 'react';
import UnitBox from '../UnitBox';
import board from './board.module.css'

export interface IAppProps {
}

export default function Board(props: IAppProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [cells, setCells] = useState(0);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const update = () => {
            const style = getComputedStyle(el);
            const tracks = style.gridTemplateColumns.split(" ");

            const cols = tracks.length;
            const cellSize = parseFloat(tracks[0]);
            const gap = parseFloat(style.rowGap);

            const available = window.innerHeight - el.getBoundingClientRect().top - 70;
            const rows = Math.ceil((available + gap) / (cellSize + gap));

            setCells(cols * rows);
        };

        update();

        const observer = new ResizeObserver(update);
        observer.observe(el);
        window.addEventListener("resize", update);

        return () => {
        observer.disconnect();
        window.removeEventListener("resize", update);
        };
    }, []);

    return (
        <div ref={ref} className={board.grid}>
        {Array.from({ length: cells }, (_, i) => (
            <UnitBox key={i} />
        ))}
        </div>
    );
}
