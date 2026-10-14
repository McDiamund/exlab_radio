import ubox from './ubox.module.css'

export interface IAppProps {
  pos: number
  rows: number
  cols: number
}

export default function UnitBox(props: IAppProps) {

  const isOuter = (x : Number, y: Number):Boolean => {
    return true;
  }

  const coords = () => {
    const row = Math.ceil(props.pos / props.cols)
    const col = (props.pos % props.cols) == 0 ? props.cols : Math.ceil(props.pos % props.cols)
    return `(${row},${col})`
  } 

  return (
    <div className={ubox.ubox}>
      {isOuter(1,1) && <h1 className={`green sans`}>{props.pos.toString()}</h1>}
      <h3>{coords().toString()}</h3>
    </div>
  );
}
