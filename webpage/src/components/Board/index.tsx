import { useEffect, useRef, useState } from 'react';
import UnitBox from '../UnitBox';
import board from './board.module.css'

export interface IAppProps {
}

export default function Board(props: IAppProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [cells, setCells] = useState(0);
    const [cols, setCols] = useState(0);
    const [rows, setRows] = useState(0);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const update = () => {
            const style = getComputedStyle(el);
            const tracks = style.gridTemplateColumns.split(" ");

            const cols = tracks.length;
            const cellSize = 110;

            const available = el.getBoundingClientRect().bottom - el.getBoundingClientRect().top - 100;
            const rows = Math.ceil((available) / (cellSize));

            setCells(cols * rows);
            setCols(cols);
            setRows(rows);
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
        <div className={board.container}>
            <div ref={ref} className={board.grid}>
                {Array.from({ length: cells }, (_, i) => (
                    <UnitBox key={i} pos={i + 1} rows={rows} cols={cols} />
                ))}
            </div>
        </div>
    );
}
