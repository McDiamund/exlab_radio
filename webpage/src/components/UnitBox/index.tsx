import ubox from './ubox.module.css'

export interface UnitBoxProps {
  pos: number
  maxRows: number
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
  
  const isTopCorner = () => {
    return (row == 1) && (col == props.maxCols || col == 1)
  }

  const isBottomCorner = () => {
    return (row == props.maxRows) && (col == props.maxCols || col == 1)
  }

  if (isOuter)
    return (
      <div className={ubox.ubox}>
          <>
            <h1 className={`green sans`}>{unit()}</h1>
            <h3>{`(${row},${col})`}</h3>
          </>
      </div>
    );
  else
    return (
      <div className={ubox.ubox}>
          <>
            <h1 className={`green sans`}></h1>
          </>
      </div>
    );
}
