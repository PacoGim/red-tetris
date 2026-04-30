import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type Block = [number, number]
type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z'

type Piece = {
  type: TetrominoType
  rotation: number
  x: number
  y: number
  color: string
}

type Grid = string[][]

const ROWS = 20
const COLS = 10

const SHAPES: Record<TetrominoType, Block[][]> = {
  I: [
    [ [0, 1], [1, 1], [2, 1], [3, 1] ],
    [ [2, 0], [2, 1], [2, 2], [2, 3] ],
  ],
  J: [
    [ [0, 0], [0, 1], [1, 1], [2, 1] ],
    [ [1, 0], [2, 0], [1, 1], [1, 2] ],
    [ [0, 1], [1, 1], [2, 1], [2, 2] ],
    [ [1, 0], [1, 1], [0, 2], [1, 2] ],
  ],
  L: [
    [ [2, 0], [0, 1], [1, 1], [2, 1] ],
    [ [1, 0], [1, 1], [1, 2], [2, 2] ],
    [ [0, 1], [1, 1], [2, 1], [0, 2] ],
    [ [0, 0], [1, 0], [1, 1], [1, 2] ],
  ],
  O: [
    [ [1, 0], [2, 0], [1, 1], [2, 1] ],
  ],
  S: [
    [ [1, 0], [2, 0], [0, 1], [1, 1] ],
    [ [1, 0], [1, 1], [2, 1], [2, 2] ],
  ],
  T: [
    [ [1, 0], [0, 1], [1, 1], [2, 1] ],
    [ [1, 0], [1, 1], [2, 1], [1, 2] ],
    [ [0, 1], [1, 1], [2, 1], [1, 2] ],
    [ [1, 0], [0, 1], [1, 1], [1, 2] ],
  ],
  Z: [
    [ [0, 0], [1, 0], [1, 1], [2, 1] ],
    [ [2, 0], [1, 1], [2, 1], [1, 2] ],
  ],
}

const COLORS: Record<TetrominoType, string> = {
  I: '#4dd0e1',
  J: '#5c6bc0',
  L: '#ffb74d',
  O: '#ffee58',
  S: '#66bb6a',
  T: '#ab47bc',
  Z: '#ef5350',
}

const TYPES = Object.keys(SHAPES) as TetrominoType[]

const createEmptyGrid = (): Grid =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(''))

const randomPiece = (): Piece => {
  const type = TYPES[Math.floor(Math.random() * TYPES.length)]
  return {
    type,
    rotation: 0,
    x: 3,
    y: 0,
    color: COLORS[type],
  }
}

const getBlocks = ({ type, rotation }: Piece): Block[] => {
  const shapes = SHAPES[type]
  return shapes[rotation % shapes.length]
}

const collides = (grid: Grid, piece: Piece, x = piece.x, y = piece.y, rotation = piece.rotation) =>
  getBlocks({ ...piece, rotation }).some(([dx, dy]) => {
    const row = y + dy
    const col = x + dx
    if (col < 0 || col >= COLS || row >= ROWS) return true
    if (row < 0) return false
    return !!grid[row][col]
  })

const lockPiece = (grid: Grid, piece: Piece): Grid => {
  const nextGrid = grid.map((row) => [...row])
  getBlocks(piece).forEach(([dx, dy]) => {
    const row = piece.y + dy
    const col = piece.x + dx
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      nextGrid[row][col] = piece.color
    }
  })
  return nextGrid
}

const clearLines = (grid: Grid) => {
  const filtered = grid.filter((row) => row.some((cell) => cell !== ''))
  const linesCleared = ROWS - filtered.length
  const nextGrid = Array.from({ length: linesCleared }, () => Array(COLS).fill('')).concat(filtered)
  return { grid: nextGrid, linesCleared }
}

function App() {
  const [grid, setGrid] = useState<Grid>(() => createEmptyGrid())
  const [activePiece, setActivePiece] = useState<Piece>(() => randomPiece())
  const [nextPiece, setNextPiece] = useState<Piece>(() => randomPiece())
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const displayGrid = useMemo(() => {
    const output = grid.map((row) => [...row])
    getBlocks(activePiece).forEach(([dx, dy]) => {
      const row = activePiece.y + dy
      const col = activePiece.x + dx
      if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
        output[row][col] = activePiece.color
      }
    })
    return output
  }, [grid, activePiece])

  const resetGame = () => {
    const first = randomPiece()
    const next = randomPiece()
    setGrid(createEmptyGrid())
    setActivePiece(first)
    setNextPiece(next)
    setScore(0)
    setGameOver(false)
    setIsPaused(false)
  }

  const movePiece = (dx: number, dy: number) => {
    if (gameOver || isPaused) return false
    if (!collides(grid, activePiece, activePiece.x + dx, activePiece.y + dy)) {
      setActivePiece((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
      return true
    }
    return false
  }

  const rotatePiece = () => {
    if (gameOver || isPaused) return
    const nextRotation = (activePiece.rotation + 1) % SHAPES[activePiece.type].length
    const rotated = { ...activePiece, rotation: nextRotation }
    if (!collides(grid, rotated)) {
      setActivePiece(rotated)
      return
    }
    const offset = [-1, 1, -2, 2]
    for (const dx of offset) {
      if (!collides(grid, rotated, activePiece.x + dx, activePiece.y)) {
        setActivePiece({ ...rotated, x: activePiece.x + dx })
        return
      }
    }
  }

  const hardDrop = () => {
    if (gameOver || isPaused) return
    let nextY = activePiece.y
    while (!collides(grid, activePiece, activePiece.x, nextY + 1)) {
      nextY += 1
    }
    setActivePiece((prev) => ({ ...prev, y: nextY }))
    lockAndSpawn({ ...activePiece, y: nextY })
  }

  const lockAndSpawn = (piece: Piece) => {
    const locked = lockPiece(grid, piece)
    const { grid: clearedGrid, linesCleared } = clearLines(locked)
    setGrid(clearedGrid)
    setScore((prev) => prev + linesCleared * 100)
    setActivePiece(nextPiece)
    setNextPiece(randomPiece())
    if (collides(clearedGrid, nextPiece)) {
      setGameOver(true)
    }
  }

  const drop = () => {
    if (gameOver || isPaused) return
    if (!movePiece(0, 1)) {
      lockAndSpawn(activePiece)
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (gameOver && event.key !== 'Enter') return
      switch (event.key) {
        case 'ArrowLeft':
          movePiece(-1, 0)
          break
        case 'ArrowRight':
          movePiece(1, 0)
          break
        case 'ArrowDown':
          movePiece(0, 1)
          break
        case 'ArrowUp':
          rotatePiece()
          break
        case ' ':
          event.preventDefault()
          hardDrop()
          break
        case 'p':
        case 'P':
          setIsPaused((prev) => !prev)
          break
        case 'Enter':
          if (gameOver) resetGame()
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activePiece, gameOver, grid, isPaused, nextPiece])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    if (!gameOver && !isPaused) {
      const speed = Math.max(120, 700 - Math.floor(score / 200) * 20)
      intervalRef.current = setInterval(drop, speed)
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [drop, gameOver, isPaused, score])

  const helpText = gameOver ? 'Appuyez sur Entrée pour recommencer' : 'Flèches = déplacer, ↑ = tourner, espace = chute rapide'

  return (
    <main className="app-shell">
      <section className="tetris-panel">
        <header className="header-bar">
          <div>
            <h1>Tetris React</h1>
            <p>{helpText}</p>
          </div>
          <button className="action-button" onClick={resetGame}>
            {gameOver ? 'Rejouer' : 'Recommencer'}
          </button>
        </header>

        <div className="game-layout">
          <section className="board-card">
            <div className={`board-frame ${gameOver ? 'game-over' : ''}`}>
              <div className="grid" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
                {displayGrid.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`cell ${cell ? 'filled' : ''}`}
                      style={{ background: cell || 'transparent' }}
                    />
                  )),
                )}
              </div>
              {gameOver && <div className="overlay">Game Over</div>}
            </div>
          </section>

          <aside className="sidebar-card">
            <div className="stat-block">
              <span>Score</span>
              <strong>{score}</strong>
            </div>
            <div className="stat-block">
              <span>Prochaine</span>
              <div className="next-piece">
                <div className="next-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                  {Array.from({ length: 16 }, (_, index) => {
                    const row = Math.floor(index / 4)
                    const col = index % 4
                    const blocks = getBlocks(nextPiece)
                    const nextColor = blocks.some(([dx, dy]) => dx === col && dy === row)
                      ? nextPiece.color
                      : ''
                    return (
                      <div
                        key={`next-${index}`}
                        className={`next-cell ${nextColor ? 'filled' : ''}`}
                        style={{ background: nextColor || 'transparent' }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="controls">
              <span>Contrôles</span>
              <ul>
                <li>← / → : déplacer</li>
                <li>↓ : descendre</li>
                <li>↑ : tourner</li>
                <li>espace : chute rapide</li>
                <li>P : pause</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}

export default App
