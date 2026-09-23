type BrandMarkProps = {
  compact?: boolean
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="brand" aria-label="JasTalant">
      <span className="brand__mark" aria-hidden="true">
        <img src="/jastalant.svg" alt="" />
      </span>
      {!compact && <span className="brand__name">JasTalant</span>}
    </div>
  )
}
