import { useEffect, useState } from 'react'
import ubox from './ubox.module.css'

export interface UnitBoxProps {
  pos: number
  maxRows: number
  cellSize: number
  maxCols: number
  onClick: React.MouseEventHandler<HTMLDivElement>
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

  if (isOuter)
    if (isBottomCorner()) {
      return (
        <div className={`${ubox.ubox} ${ubox.bottomCorner}`} onClick={(e) => props.onClick(e)}>
              <h1 className={`green sans`}>{col}</h1>
              <h1 className={`green sans`}>{row}</h1>
        </div>
      );
    }
    else if (isTopRightCorner()) {
      return (
        <div className={`${ubox.ubox} ${ubox.topCorner}`} onClick={(e) => props.onClick(e)}>
              <h1 className={`green sans`}>{col}</h1>
              <span style={{flex: 1}} />
              <h1 className={`green sans`}>{row}</h1>
        </div>
      );
    }
    else if (isTopLeftCorner()) {
      return (
        <div className={`${ubox.ubox} ${ubox.topCorner}`} onClick={(e) => props.onClick(e)}>
              <h1 className={`green sans`}>{col}</h1>
        </div>
      );
    }
    else
      return (
        <div className={ubox.ubox} onClick={(e) => props.onClick(e)}>
            <>
              <h1 className={`green sans`}>{unit()}</h1>
              {/* <h3>{`(${row},${col})`}</h3> */}
            </>
        </div>
      );
  else
    return (
      <div className={ubox.ubox} onClick={(e) => props.onClick(e)}>
          <>
            <h1 className={`green sans`}></h1>
          </>
      </div>
    );
}
