import { useEffect, useRef, useState } from 'react';
import UnitBox from '../UnitBox';
import board from './board.module.css'

export interface IAppProps {
}

export default function Board(props: IAppProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [cells, setCells] = useState(0);
    const [cellSize, setCellSize] = useState(0);
    const [cols, setCols] = useState(0);
    const [rows, setRows] = useState(0);
    

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const update = () => {
            const style = getComputedStyle(el);
            const tracks = style.gridTemplateColumns.split(" ");

            const cols = tracks.length;
            const cellSize = parseFloat(tracks[0]);

            const available = el.getBoundingClientRect().bottom - el.getBoundingClientRect().top;
            const rows = Math.ceil((available) / (cellSize));

            setCells(cols * rows);
            setCols(cols);
            setRows(rows);
            setCellSize(cellSize)
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

    const expandToggle = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        // e.currentTarget.classList.toggle('expand')

        const rect = e.currentTarget.getBoundingClientRect();
        const targetHeight = (e.currentTarget.offsetHeight - 0.5) * 3;
        const targetWidth = (e.currentTarget.offsetWidth - 0.75) * 3;

        const box = document.createElement('div');
        box.textContent = 'I am a Div'

        Object.assign(box.style, {
            top: `${rect.top + 1}px`,
            left: `${rect.left + 1}px`,
            zIndex: 2,
            position: 'absolute',
            width: `${e.currentTarget.offsetWidth}px`,
            height: `${e.currentTarget.offsetHeight}px`,
            // border: 'rgb(193, 253, 83) solid 0.5px',
            backgroundColor: 'hsl(155, 96%, 22%)',
            overflow: 'hidden',
            transition: 'width 0.3s ease-out, height 0.3s ease-out',
        })

        box.addEventListener('mouseenter', () => {
            Object.assign(box.style, {
                cursor: 'pointer'
            })
        })

        box.addEventListener('click', () => {
            box.remove()
        })

        document.body.appendChild(box)

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                box.style.height = `${targetHeight}px`;
            });
            requestAnimationFrame(() => {
                box.style.width = `${targetWidth}px`;
            });
        });



        // const isExpanded = e.currentTarget.classList.contains('expand')
        // e.currentTarget.style.width = isExpanded ? `${props.cellSize * 4}px` : '100%'
        
        // e.currentTarget.style.backgroundColor = isExpanded ? 'blue' : 'transparent'
        // e.currentTarget.style.zIndex = isExpanded ? '20' : '1'
    }

    return (
        <div className={board.container}>
            <div ref={ref} className={board.grid}>
                {Array.from({ length: cells }, (_, i) => (
                    <UnitBox onClick={(e) => expandToggle(e)} key={i} pos={i + 1} maxRows={rows} maxCols={cols} cellSize={cellSize} />
                ))}
            </div>
        </div>
    );
}
