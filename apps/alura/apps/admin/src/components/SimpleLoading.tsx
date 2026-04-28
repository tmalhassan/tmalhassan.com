export default function name({ endAnim, style }: { endAnim: boolean, style?: object }) {
    return (
        <div className="simple-loading-container" data-endanim={endAnim} style={style}>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
        </div>
    )
}