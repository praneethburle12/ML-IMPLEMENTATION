
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Direction } from './types';

interface SnakeGameProps {
  currentDirection: Direction;
  isPaused: boolean;
}

const GRID_SIZE = 20;
const CANVAS_SIZE = 400;

export const SnakeGame: React.FC<SnakeGameProps> = ({ currentDirection, isPaused }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snake, setSnake] = useState<{ x: number, y: number }[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState<Direction>(Direction.RIGHT);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);

  // Buffer for directional input to prevent 180-degree turns
  const pendingDirection = useRef<Direction>(Direction.RIGHT);

  useEffect(() => {
    if (currentDirection !== Direction.NONE) {
      // Prevent reversing
      if (currentDirection === Direction.UP && direction !== Direction.DOWN) pendingDirection.current = Direction.UP;
      if (currentDirection === Direction.DOWN && direction !== Direction.UP) pendingDirection.current = Direction.DOWN;
      if (currentDirection === Direction.LEFT && direction !== Direction.RIGHT) pendingDirection.current = Direction.LEFT;
      if (currentDirection === Direction.RIGHT && direction !== Direction.LEFT) pendingDirection.current = Direction.RIGHT;
    }
  }, [currentDirection, direction]);

  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      const head = { ...prevSnake[0] };
      const currentDir = pendingDirection.current;
      setDirection(currentDir);

      switch (currentDir) {
        case Direction.UP: head.y -= 1; break;
        case Direction.DOWN: head.y += 1; break;
        case Direction.LEFT: head.x -= 1; break;
        case Direction.RIGHT: head.x += 1; break;
      }

      // Check collision with walls
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setGameOver(true);
        return prevSnake;
      }

      // Check collision with self
      if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setGameOver(true);
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        setScore(s => s + 10);
        setFood({
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE)
        });
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [food]);

  useEffect(() => {
    if (gameOver || isPaused) return;
    // Set a slower interval for the snake movement as requested (200ms)
    const interval = setInterval(moveSnake, 200);
    return () => clearInterval(interval);
  }, [moveSnake, gameOver, isPaused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Grid lines (faint)
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < CANVAS_SIZE; i += CANVAS_SIZE / GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i); ctx.stroke();
    }

    // Food
    ctx.fillStyle = '#f43f5e';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#f43f5e';
    const cell = CANVAS_SIZE / GRID_SIZE;
    ctx.beginPath();
    ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake
    snake.forEach((segment, i) => {
      ctx.fillStyle = i === 0 ? '#22d3ee' : '#0891b2';
      if (i === 0) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#22d3ee';
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillRect(segment.x * cell + 1, segment.y * cell + 1, cell - 2, cell - 2);
    });
    ctx.shadowBlur = 0;

  }, [snake, food]);

  const resetGame = () => {
    if (score > highScore) setHighScore(score);
    setSnake([{ x: 10, y: 10 }]);
    setFood({ x: 15, y: 15 });
    setScore(0);
    setGameOver(false);
    setDirection(Direction.RIGHT);
    pendingDirection.current = Direction.RIGHT;
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex justify-between w-full max-w-[400px] mb-2 orbitron">
        <div className="text-cyan-400">SCORE: <span className="text-white">{score}</span></div>
        <div className="text-gray-400">BEST: <span className="text-white">{highScore}</span></div>
      </div>

      <div className="relative neon-border overflow-hidden rounded-lg">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="bg-slate-900"
        />
        {isPaused && !gameOver && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-yellow-400 orbitron animate-pulse">SYSTEM PAUSED</h2>
            <p className="text-cyan-400 mt-2 text-xs">RELEASE FIST TO RESUME</p>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center">
            <h2 className="text-3xl font-bold text-rose-500 orbitron mb-4">GAME OVER</h2>
            <p className="text-cyan-400 mb-6">FINAL SCORE: {score}</p>
            <button
              onClick={resetGame}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full orbitron transition-all"
            >
              REBOOT SYSTEM
            </button>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500 orbitron text-center max-w-[400px]">
        ☝️ UP | ✌️ DOWN | 🤟 RIGHT | 🖖 LEFT
      </div>
    </div>
  );
};
