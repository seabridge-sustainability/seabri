interface RecommendationListProps {
  recommendations: string[]
}

export function RecommendationList({ recommendations }: RecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <div style={{ padding: '12px 16px', color: 'var(--text-muted, #888)', fontSize: 13, fontStyle: 'italic' }}>
        No recommendations — you're running efficiently.
      </div>
    )
  }

  return (
    <ul style={{ margin: 0, padding: '0 0 0 20px', listStyle: 'disc' }}>
      {recommendations.map((rec, i) => (
        <li
          key={i}
          style={{
            fontSize: 13,
            color: 'var(--text-primary, #ccc)',
            padding: '4px 0',
            lineHeight: 1.5,
          }}
        >
          {rec}
        </li>
      ))}
    </ul>
  )
}
