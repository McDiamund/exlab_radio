import { useEffect, useState } from 'react'
import ubox from './ubox.module.css'

export interface UnitBoxProps {
  pos: number
  maxRows: number
  cellSize: number
  maxCols: number
}

export default function UnitBox(props: UnitBoxProps) {
  const row = Math.ceil(props.pos / props.maxCols);
  const col = (props.pos % props.maxCols) == 0 ? props.maxCols : Math.ceil(props.pos % props.maxCols);
  const isOuter = row == props.maxRows || row == 1 || col == props.maxCols || col == 1;

  const unit = () => {
    if (col == props.maxCols || col == 1) {
      return row;
    }
    return col;
  }
  
  const isTopLeftCorner = () => {
    return (row == 1) && (col == 1)
  }

  const isTopRightCorner = () => {
    return (row == 1) && (col == props.maxCols)
  }

  const isBottomCorner = () => {
    return (row == props.maxRows) && (col == props.maxCols || col == 1)
  }

  const expandToggle = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.currentTarget.classList.toggle('expand')

    const box = document.createElement('div');
    box.textContent = 'I am a Div'

    Object.assign(box.style, {
      top: `${e.currentTarget.getBoundingClientRect().top}px`,
      left: `${e.currentTarget.getBoundingClientRect().left}px`,
      zIndex: 2,
      position: 'absolute',
      width: `${props.cellSize}px`,
      height: `${props.cellSize}px`,
      backgroundColor: 'blue'
    })

    document.body.appendChild(box)



    // const isExpanded = e.currentTarget.classList.contains('expand')
    // e.currentTarget.style.width = isExpanded ? `${props.cellSize * 4}px` : '100%'
    
    // e.currentTarget.style.backgroundColor = isExpanded ? 'blue' : 'transparent'
    // e.currentTarget.style.zIndex = isExpanded ? '20' : '1'
  }

  if (isOuter)
    if (isBottomCorner()) {
      return (
        <div className={`${ubox.ubox} ${ubox.bottomCorner}`}>
              <h1 className={`green sans`}>{col}</h1>
              <h1 className={`green sans`}>{row}</h1>
        </div>
      );
    }
    else if (isTopRightCorner()) {
      return (
        <div className={`${ubox.ubox} ${ubox.topCorner}`}>
              <h1 className={`green sans`}>{col}</h1>
              <span style={{flex: 1}} />
              <h1 className={`green sans`}>{row}</h1>
        </div>
      );
    }
    else if (isTopLeftCorner()) {
      return (
        <div className={`${ubox.ubox} ${ubox.topCorner}`}>
              <h1 className={`green sans`}>{col}</h1>
        </div>
      );
    }
    else
      return (
        <div className={ubox.ubox}>
            <>
              <h1 className={`green sans`}>{unit()}</h1>
              {/* <h3>{`(${row},${col})`}</h3> */}
            </>
        </div>
      );
  else
    return (
      <div className={ubox.ubox} onClick={(e) => expandToggle(e)}>
          <>
            <h1 className={`green sans`}></h1>
          </>
      </div>
    );
}
