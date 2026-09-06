import React, { useState, useCallback, useRef, useEffect } from 'react'
import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

interface PatternLockProps {
  size?: number
  dotSize?: number
  color?: string
  onChange?: (pattern: number[]) => void
}

const GRID = 3
const TOTAL = GRID * GRID

interface Point {
  x: number
  y: number
}

function getDotCenter(index: number, cellSize: number): Point {
  const row = Math.floor(index / GRID)
  const col = index % GRID
  return {
    x: col * cellSize + cellSize / 2,
    y: row * cellSize + cellSize / 2,
  }
}

// 手指进入点的吸附半径内即算滑中该点
function getDotIndex(x: number, y: number, cellSize: number, dotSize: number): number | null {
  const snapRadius = dotSize / 2 + cellSize * 0.2
  for (let i = 0; i < TOTAL; i++) {
    const center = getDotCenter(i, cellSize)
    if (Math.sqrt((x - center.x) ** 2 + (y - center.y) ** 2) <= snapRadius) {
      return i
    }
  }
  return null
}

function getDistance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

function getAngle(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '')
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const num = parseInt(h, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const PatternLock: React.FC<PatternLockProps> = ({
  size = 280,
  dotSize = 22,
  color = '#237166',
  onChange,
}) => {
  const [pattern, setPattern] = useState<number[]>([])
  const [finger, setFinger] = useState<Point | null>(null)
  // 自适应容器宽度：测量 .pattern-lock 的实际像素宽度后以此为图案边长，
  // 确保图案始终完整包在父容器内，不因设备屏幕差异而溢出。
  const [containerWidth, setContainerWidth] = useState<number | null>(null)

  const offsetRef = useRef({ x: 0, y: 0 })
  const offsetMeasuredRef = useRef(false)
  const touchingRef = useRef(false)
  // 将 cellSize / dotSize 保存到 ref，使 PanResponder 等长期存在的闭包
  // 始终读取到最新的自适应尺寸，而不是挂载时的快照。
  const cellSizeRef = useRef(size / GRID)
  const dotSizeRef = useRef(dotSize)
  // pattern must be read via ref inside touch handlers: touch events fire more
  // frequently than React re-renders, so the state closure would be stale
  const patternRef = useRef<number[]>([])
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const effectiveSize = containerWidth ?? size
  const cellSize = effectiveSize / GRID
  const wrapSize = dotSize + 16

  // 同步最新的 cellSize / dotSize 到 ref，使 touch handler 闭包始终读取最新值
  useEffect(() => {
    cellSizeRef.current = cellSize
    dotSizeRef.current = dotSize
  }, [cellSize, dotSize])

  // Query the grid's viewport position. On mini programs (WeChat) this is the
  // only reliable way to translate page-level touch coords into element coords,
  // and it must run AFTER the node is laid out. If it runs too early (e.g. on
  // a page re-entry) the rect comes back null/zero-width, so callers retry.
  const measure = useCallback((onDone?: () => void) => {
    if (process.env.TARO_ENV === 'rn') {
      offsetMeasuredRef.current = true
      if (onDone) onDone()
      return
    }
    Taro.createSelectorQuery()
      .select('.pattern-grid')
      .boundingClientRect((rect: any) => {
        if (rect && !Array.isArray(rect) && rect.width > 0 && rect.height > 0) {
          offsetRef.current = { x: rect.left, y: rect.top }
          offsetMeasuredRef.current = true
        }
        if (onDone) onDone()
      })
      .exec()
  }, [])

  // Measure on mount and retry until it succeeds: on page re-entry the layout
  // may not be ready on the first attempt, leaving the offset unmeasured.
  useEffect(() => {
    if (process.env.TARO_ENV === 'rn') {
      offsetMeasuredRef.current = true
      return
    }
    let cancelled = false
    let retries = 0
    const tryMeasure = () => {
      if (cancelled) return
      measure(() => {
        if (cancelled) return
        if (!offsetMeasuredRef.current && retries < 6) {
          retries++
          Taro.nextTick(tryMeasure)
        }
      })
    }
    Taro.nextTick(tryMeasure)
    return () => {
      cancelled = true
    }
  }, [measure])

  // 测量 .pattern-lock 容器的实际宽度，以此作为图案尺寸，
  // 这样无论设备屏幕、父容器百分比如何变化，图案都能完整包在卡片内。
  useEffect(() => {
    if (process.env.TARO_ENV === 'rn') {
      // RN 端使用独立的 index.rn.tsx，通过 onLayout 获取宽度，无需此处测量
      return
    }
    let cancelled = false
    let retries = 0
    const tryMeasure = () => {
      if (cancelled) return
      Taro.createSelectorQuery()
        .select('.pattern-lock')
        .boundingClientRect((rect: any) => {
          if (rect && !Array.isArray(rect) && rect.width > 0) {
            setContainerWidth(rect.width)
          }
          if (!containerWidth && retries < 6) {
            retries++
            Taro.nextTick(tryMeasure)
          }
        })
        .exec()
    }
    Taro.nextTick(tryMeasure)
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 窗口尺寸变化（如横竖屏切换）后重新测量容器宽度
  useEffect(() => {
    const handler = () => {
      if (process.env.TARO_ENV === 'rn') return
      Taro.createSelectorQuery()
        .select('.pattern-lock')
        .boundingClientRect((rect: any) => {
          if (rect && !Array.isArray(rect) && rect.width > 0) {
            setContainerWidth(rect.width)
          }
        })
        .exec()
    }
    Taro.onWindowResize(handler)
    return () => {
      Taro.offWindowResize(handler)
    }
  }, [])

  const getTouchCoords = useCallback((e: any, touch: any): Point => {
    if (touch.locationX !== undefined) {
      // React Native: locationX/locationY are relative to the element
      return { x: touch.locationX, y: touch.locationY }
    }
    // H5: the element rect can be read synchronously from the DOM node
    const ct = e && e.currentTarget
    if (ct && typeof ct.getBoundingClientRect === 'function') {
      const rect = ct.getBoundingClientRect()
      if (rect && typeof rect.left === 'number') {
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
      }
    }
    // Mini programs: viewport-relative touches minus the measured offset
    const cx = typeof touch.clientX === 'number' ? touch.clientX : touch.pageX
    const cy = typeof touch.clientY === 'number' ? touch.clientY : touch.pageY
    return {
      x: cx - offsetRef.current.x,
      y: cy - offsetRef.current.y,
    }
  }, [])

  // 滑过的点可以再次滑中，只要与上一个点不同就追加进序列，不限长度
  const appendDot = useCallback((index: number) => {
    const last = patternRef.current[patternRef.current.length - 1]
    if (last === index) return
    const next = [...patternRef.current, index]
    patternRef.current = next
    setPattern(next)
  }, [])

  const handleTouchStart = useCallback(
    (e: any) => {
      // 兜底：如果挂载时的测量失败，在此补一次测量，本次手势后续的
      // touchMove 就能拿到正确坐标，避免整个手势完全无响应
      if (!offsetMeasuredRef.current) measure()
      touchingRef.current = true
      patternRef.current = []
      setPattern([])
      const touch = e.touches[0]
      const point = getTouchCoords(e, touch)
      setFinger(point)
      const index = getDotIndex(point.x, point.y, cellSizeRef.current, dotSizeRef.current)
      if (index !== null) appendDot(index)
    },
    [getTouchCoords, appendDot, measure],
  )

  const handleTouchMove = useCallback(
    (e: any) => {
      if (!touchingRef.current) return
      const touch = e.touches[0]
      const point = getTouchCoords(e, touch)
      // 轨迹线跟随手指实时移动
      setFinger(point)
      const index = getDotIndex(point.x, point.y, cellSizeRef.current, dotSizeRef.current)
      if (index !== null) appendDot(index)
    },
    [getTouchCoords, appendDot],
  )

  const handleTouchEnd = useCallback(() => {
    if (!touchingRef.current) return
    touchingRef.current = false
    setFinger(null)
    const result = patternRef.current
    if (result.length > 0 && onChangeRef.current) {
      // 将 0-8 映射为 1-9
      onChangeRef.current(result.map((i) => i + 1))
    }
    patternRef.current = []
    setPattern([])
  }, [])

  const renderSegment = (from: Point, to: Point, key: string, alpha: number, className: string) => {
    const distance = getDistance(from, to)
    const angle = getAngle(from, to)
    const cx = (from.x + to.x) / 2
    const cy = (from.y + to.y) / 2
    return (
      <View
        key={key}
        className={className}
        style={{
          width: distance,
          height: 3,
          left: cx - distance / 2,
          top: cy - 1.5,
          backgroundColor: withAlpha(color, alpha),
          transform: `rotate(${angle}deg)`,
        }}
      />
    )
  }

  const renderLines = () => {
    if (pattern.length === 0) return null
    const elements: React.ReactNode[] = []
    // 已滑中的点之间连线
    for (let i = 0; i < pattern.length - 1; i++) {
      const from = getDotCenter(pattern[i], cellSize)
      const to = getDotCenter(pattern[i + 1], cellSize)
      elements.push(renderSegment(from, to, `line-${i}`, 0.45, 'pattern-line'))
    }
    // 最后一个点连接到手指当前位置的轨迹线，抬手后自动消失
    if (finger && touchingRef.current) {
      const last = pattern[pattern.length - 1]
      const from = getDotCenter(last, cellSize)
      elements.push(renderSegment(from, finger, 'line-follow', 0.25, 'pattern-line-follow'))
    }
    return elements
  }

  return (
    <View className="pattern-lock">
      <View
        className="pattern-grid"
        style={{ width: effectiveSize, height: effectiveSize }}
        catchMove
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {renderLines()}
        {Array.from({ length: TOTAL }).map((_, i) => {
          const center = getDotCenter(i, cellSize)
          const isSelected = pattern.includes(i)
          return (
            <View
              key={i}
              className="pattern-dot-wrap"
              style={{
                width: wrapSize,
                height: wrapSize,
                left: center.x - wrapSize / 2,
                top: center.y - wrapSize / 2,
              }}
            >
              {isSelected ? (
                <View
                  className="pattern-dot-halo"
                  style={{
                    backgroundColor: withAlpha(color, 0.16),
                    borderRadius: wrapSize / 2,
                  }}
                />
              ) : null}
              <View
                className="pattern-dot"
                style={{
                  width: dotSize,
                  height: dotSize,
                  backgroundColor: isSelected ? color : undefined,
                }}
              >
                {isSelected ? <View className="pattern-dot-core" /> : null}
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export default PatternLock
