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
  const scaleRef = useRef(1)
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
  // 当前生效的图案边长（布局像素），供 measure 计算换算比例时读取。
  // 用 ref 保存，避免 measure 因依赖 effectiveSize 状态而频繁重建闭包。
  const effectiveSizeRef = useRef(effectiveSize)
  effectiveSizeRef.current = effectiveSize

  // 同步最新的 cellSize / dotSize 到 ref，使 touch handler 闭包始终读取最新值
  useEffect(() => {
    cellSizeRef.current = cellSize
    dotSizeRef.current = dotSize
  }, [cellSize, dotSize])

  // Query the grid and container positions. On mini-programs this is the only
  // reliable way to translate page-level touch coords into element coords.
  //
  // Scale is derived from the grid itself (boundingClientRect width / CSS width),
  // which is stable across all devices and screen sizes without depending on
  // windowWidth (which may or may not reflect the display space on some devices).
  //
  // 关键：mount 时首次 measure 在默认 effectiveSize(280) 下运行，得到的
  // gridRect.left 包含了图案在父容器中的居中偏移；随后 setContainerWidth
  // 触发图案缩放到填满父容器，此时 grid 的 left 会变（居中偏移归零）。
  // 因此必须在 containerWidth 变化后重新 measure，更新 offsetRef，
  // 否则在 iPad 等大屏上会出现约一列的固定偏移（手指滑 N 列，N-1 列响应）。
  const measure = useCallback((onDone?: () => void) => {
    if (process.env.TARO_ENV === 'rn') {
      offsetMeasuredRef.current = true
      if (onDone) onDone()
      return
    }
    let lockRect: any = null
    let gridRect: any = null
    const finish = () => {
      if (lockRect === null || gridRect === null) return
      const okLock = lockRect && !Array.isArray(lockRect) && lockRect.width > 0
      const okGrid = gridRect && !Array.isArray(gridRect) && gridRect.width > 0

      // 以图案自身的宽为基准计算缩放比：s = 实测宽度 / CSS 像素宽度。
      // 当 resizable:true（所有坐标同空间）时 s ≈ 1；当 iPad 兼容模式
      // （boundingClientRect 被放大）时 s > 1。两种情况均正确处理。
      let s = 1
      if (okGrid && effectiveSizeRef.current > 0) {
        s = gridRect.width / effectiveSizeRef.current
      }
      if (!Number.isFinite(s) || s <= 0) s = 1
      scaleRef.current = s

      if (okLock) {
        setContainerWidth(lockRect.width / s)
      }
      if (okGrid) {
        // 保留原始 boundingClientRect 坐标（不除以 s），在 getTouchCoords
        // 中统一做 (touch - offset) / s，避免在 s≠1 时混合两个坐标空间。
        offsetRef.current = { x: gridRect.left, y: gridRect.top }
        offsetMeasuredRef.current = true
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('[PatternLock] measure', {
          scale: s,
          lockWidth: lockRect?.width,
          gridWidth: gridRect?.width,
          gridLeft: gridRect?.left,
          gridTop: gridRect?.top,
          effSize: effectiveSizeRef.current,
          offset: offsetRef.current,
          cw: okLock ? lockRect.width / s : null,
        })
      }
      if (onDone) onDone()
    }
    Taro.createSelectorQuery()
      .select('.pattern-lock')
      .boundingClientRect((rect: any) => {
        lockRect = rect
        finish()
      })
      .select('.pattern-grid')
      .boundingClientRect((rect: any) => {
        gridRect = rect
        finish()
      })
      .exec()
  }, [])

  // Measure on mount and retry several times: the first measure runs with
  // the default effectiveSize (280) and sets containerWidth, which triggers a
  // grid resize that shifts the grid's left edge. Subsequent retries re-measure
  // at the final size, correcting offsetRef. Up to 6 retries handles both
  // initial layout delays and the post-resize re-measurement.
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
        if (retries < 6) {
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

  // 窗口尺寸变化（如横竖屏切换）后重新测量容器宽度与 grid 偏移
  // （缩放比基于图案自身宽度计算，详见 measure 注释）
  useEffect(() => {
    const handler = () => {
      if (process.env.TARO_ENV === 'rn') return
      measure()
    }
    Taro.onWindowResize(handler)
    return () => {
      Taro.offWindowResize(handler)
    }
  }, [measure])

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
    // Mini programs: subtract the measured grid position (in boundingClientRect
    // space), then divide by scale to convert back to CSS-layout pixel space.
    const cx = typeof touch.clientX === 'number' ? touch.clientX : touch.pageX
    const cy = typeof touch.clientY === 'number' ? touch.clientY : touch.pageY
    return {
      x: (cx - offsetRef.current.x) / scaleRef.current,
      y: (cy - offsetRef.current.y) / scaleRef.current,
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
