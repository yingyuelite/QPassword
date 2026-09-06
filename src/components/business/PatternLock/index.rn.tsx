import React, { useState, useRef, useCallback, useEffect } from 'react'
import { PanResponder, GestureResponderEvent, View, StyleSheet } from 'react-native'

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
  // 自适应容器宽度：测量 .pattern-lock 的实际像素宽度后以此为图案边长
  const [containerWidth, setContainerWidth] = useState<number | null>(null)
  const effectiveSize = containerWidth ?? size
  const cellSize = effectiveSize / GRID
  const wrapSize = dotSize + 16

  const patternRef = useRef<number[]>([])
  const touchingRef = useRef(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const gridRef = useRef<View>(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  // 保存最新 cellSize / dotSize 到 ref，使 PanResponder 闭包始终读取最新值
  const cellSizeRef = useRef(cellSize)
  const dotSizeRef = useRef(dotSize)

  // RN 的 locationX/locationY 是相对触摸目标的，而触摸目标可能是网格内的
  // 某个圆点子元素，坐标原点会随手指滑过不同子元素而跳变，导致轨迹线乱晃。
  // 因此统一改用 pageX/pageY 减去网格的窗口偏移，保证坐标系始终一致。
  const measureOffset = useCallback((onDone?: () => void) => {
    const node = gridRef.current
    if (!node) {
      if (onDone) onDone()
      return
    }
    node.measureInWindow((x, y) => {
      if (typeof x === 'number' && typeof y === 'number') {
        offsetRef.current = { x, y }
      }
      if (onDone) onDone()
    })
  }, [])

  // 挂载后测量网格位置，布局未完成时重试
  useEffect(() => {
    let cancelled = false
    let retries = 0
    const tryMeasure = () => {
      if (cancelled) return
      measureOffset(() => {
        if (cancelled) return
        if (offsetRef.current.x === 0 && offsetRef.current.y === 0 && retries < 6) {
          retries++
          requestAnimationFrame(tryMeasure)
        }
      })
    }
    tryMeasure()
    return () => {
      cancelled = true
    }
  }, [measureOffset])

  // 同步最新的 cellSize / dotSize 到 ref，使 PanResponder 闭包始终读取最新值
  useEffect(() => {
    cellSizeRef.current = cellSize
    dotSizeRef.current = dotSize
  }, [cellSize, dotSize])

  // 测量 .pattern-lock 容器的实际宽度，以此作为图案尺寸，
  // 确保图案始终完整包在父容器内，不因设备屏幕差异而溢出。
  const handleLayout = useCallback((e: any) => {
    const w = e?.nativeEvent?.layout?.width
    if (typeof w === 'number' && w > 0) setContainerWidth(w)
  }, [])

  const getTouchPoint = (evt: GestureResponderEvent): Point => {
    const { pageX, pageY } = evt.nativeEvent
    return {
      x: pageX - offsetRef.current.x,
      y: pageY - offsetRef.current.y,
    }
  }

  // 滑过的点可以再次滑中，只要与上一个点不同就追加进序列，不限长度
  const appendDot = (index: number) => {
    const last = patternRef.current[patternRef.current.length - 1]
    if (last === index) return
    const next = [...patternRef.current, index]
    patternRef.current = next
    setPattern(next)
  }

  const finish = () => {
    touchingRef.current = false
    setFinger(null)
    const result = patternRef.current
    if (result.length > 0 && onChangeRef.current) {
      // 将 0-8 映射为 1-9
      onChangeRef.current(result.map((i) => i + 1))
    }
    patternRef.current = []
    setPattern([])
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        // 手势开始前重新测量一次，防止视图位置变化（如弹窗动画）导致坐标偏移
        measureOffset()
        touchingRef.current = true
        patternRef.current = []
        setPattern([])
        const point = getTouchPoint(evt)
        setFinger(point)
        const index = getDotIndex(point.x, point.y, cellSizeRef.current, dotSizeRef.current)
        if (index !== null) appendDot(index)
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        if (!touchingRef.current) return
        const point = getTouchPoint(evt)
        // 轨迹线跟随手指实时移动
        setFinger(point)
        const index = getDotIndex(point.x, point.y, cellSizeRef.current, dotSizeRef.current)
        if (index !== null) appendDot(index)
      },
      onPanResponderRelease: finish,
      onPanResponderTerminate: finish,
    }),
  ).current

  const renderSegment = (from: Point, to: Point, key: string, alpha: number, lineStyle: any) => {
    const distance = getDistance(from, to)
    const angle = getAngle(from, to)
    const cx = (from.x + to.x) / 2
    const cy = (from.y + to.y) / 2
    return (
      <View
        key={key}
        style={[
          lineStyle,
          {
            width: distance,
            left: cx - distance / 2,
            top: cy - 1.5,
            backgroundColor: withAlpha(color, alpha),
            transform: [{ rotate: `${angle}deg` }],
          },
        ]}
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
      elements.push(renderSegment(from, to, `line-${i}`, 0.45, styles.line))
    }
    // 最后一个点连接到手指当前位置的轨迹线，抬手后自动消失
    if (finger && touchingRef.current) {
      const last = pattern[pattern.length - 1]
      const from = getDotCenter(last, cellSize)
      elements.push(renderSegment(from, finger, 'line-follow', 0.25, styles.line))
    }
    return elements
  }

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <View
        ref={gridRef}
        style={[styles.grid, { width: effectiveSize, height: effectiveSize }]}
        {...panResponder.panHandlers}
      >
        {renderLines()}
        {Array.from({ length: TOTAL }).map((_, i) => {
          const center = getDotCenter(i, cellSize)
          const isSelected = pattern.includes(i)
          return (
            <View
              key={i}
              style={[
                styles.dotWrap,
                {
                  width: wrapSize,
                  height: wrapSize,
                  left: center.x - wrapSize / 2,
                  top: center.y - wrapSize / 2,
                },
              ]}
            >
              {isSelected ? (
                <View
                  style={[
                    styles.dotHalo,
                    {
                      backgroundColor: withAlpha(color, 0.16),
                      borderRadius: wrapSize / 2,
                    },
                  ]}
                />
              ) : null}
              <View
                style={[
                  styles.dot,
                  {
                    width: dotSize,
                    height: dotSize,
                    borderRadius: dotSize / 2,
                    backgroundColor: isSelected ? color : '#d9e6e2',
                  },
                ]}
              >
                {isSelected ? <View style={styles.dotCore} /> : null}
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  grid: {
    position: 'relative',
    overflow: 'visible',
    backgroundColor: '#f4faf8',
    borderRadius: 24,
  },
  dotWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotHalo: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  dot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  line: {
    position: 'absolute',
    height: 3,
    borderRadius: 2,
  },
})

export default PatternLock
