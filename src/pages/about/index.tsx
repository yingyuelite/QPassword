import { useState } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { showToast } from '@/utils/toast'
import Button from '@/components/base/Button'
import ConfirmDialog from '@/components/base/ConfirmDialog'
import ThemeRoot from '@/components/base/ThemeRoot'
import appIcon from '@/assets/ic_launcher_round.png'
import { USAGE_ITEMS, SECURITY_ITEMS } from '@/constants/usage'
import { savePasswords } from '@/utils/storage'
import { EVENT_PASSWORDS_CHANGED } from '@/hooks/usePasswords'
import { useNavigationBarTheme } from '@/utils/navigationBar'
import { openUrl } from '@/utils/url'
import './index.scss'
import packageJson from '../../../package.json'

const APP_NAME = '七圈密码'
const APP_EN_NAME = 'QPassword'
const APP_SLOGAN = '免注册 · 安全 · 易用 · 免费'
const DEV_EMAIL = '1750532901@qq.com'
const GITHUB_URL = 'https://github.com/yingyuelite/QPassword'

const About = () => {
  useNavigationBarTheme()
  const [clearVisible, setClearVisible] = useState(false)

  const handleCopyEmail = () => {
    Taro.setClipboardData({ data: DEV_EMAIL })
  }

  const handleOpenGithub = () => {
    openUrl(GITHUB_URL)
  }

  const handleClear = async () => {
    try {
      await savePasswords([])
      setClearVisible(false)
      showToast({ title: '已清空', icon: 'success' })
      // 通知首页刷新密码列表
      Taro.eventCenter.trigger(EVENT_PASSWORDS_CHANGED)
    } catch (err) {
      showToast({ title: '清空失败', icon: 'error' })
    }
  }

  const handleCheckUpdate = () => {
    // 非小程序端暂不支持自动更新，直接提示已是最新版本
    if (process.env.TARO_ENV !== 'weapp') {
      showToast({ title: '非小程序端暂不支持检查更新', icon: 'none' })
      return
    }
    try {
      const updateManager = Taro.getUpdateManager()
      updateManager.onCheckForUpdate((res) => {
        if (!res.hasUpdate) {
          showToast({ title: '已是最新版本', icon: 'none' })
        }
      })
      updateManager.onUpdateReady(() => {
        Taro.showModal({
          title: '更新提示',
          content: '新版本已准备好，是否重启应用？',
          success: (r) => {
            if (r.confirm) updateManager.applyUpdate()
          },
        })
      })
      updateManager.onUpdateFailed(() => {
        showToast({ title: '新版本下载失败', icon: 'none' })
      })
    } catch (err) {
      showToast({ title: '检查更新失败', icon: 'none' })
    }
  }

  return (
    <ThemeRoot>
      <View className="about-page">
        <ScrollView enable-flex="true" scrollY className="about-body">
          <View className="about-header">
            <View className="about-logo">
              <Image className="about-logo-img" src={appIcon} mode="aspectFit" />
            </View>
            <Text className="about-name">{APP_NAME}</Text>
            <Text className="about-subname">{APP_EN_NAME}</Text>
            <Text className="about-slogan">{APP_SLOGAN}</Text>
            <Text className="about-version">版本 v{packageJson.version}</Text>
            {process.env.TARO_ENV === 'weapp' && (
              <Button className="about-check-btn" type="dashed" size="small" block onClick={handleCheckUpdate}>
                检查更新
              </Button>
            )}
          </View>

          <View className="about-section">
            <Text className="about-section-title">使用说明</Text>
            <View className="about-section-body">
              {USAGE_ITEMS.map((text, idx) => (
                <View key={idx} className="about-section-item">
                  <Text className="about-section-text">{text}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="about-section">
            <Text className="about-section-title">数据安全性</Text>
            <View className="about-section-body">
              {SECURITY_ITEMS.map((text, idx) => (
                <View key={idx} className="about-section-item">
                  <Text className="about-section-text">{text}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="about-section">
            <Text className="about-section-title">开发者信息</Text>
            <View className="about-section-body">
              <View className="about-section-item">
                <Text className="about-dev-label">开发者</Text>
                <Text className="about-section-text about-dev-name">@独毒火</Text>
              </View>
              <View className="about-section-item">
                <Text className="about-dev-label">开发者邮箱</Text>
                <Text className="about-section-text about-dev-email" selectable onClick={handleCopyEmail}>{DEV_EMAIL}</Text>
              </View>
              <View className="about-section-item">
                <Text className="about-dev-label">开源地址</Text>
                <Text className="about-section-text about-dev-link" selectable onClick={handleOpenGithub}>{GITHUB_URL}</Text>
              </View>
              <View className="about-section-item">
                <Text className="about-dev-label">动力来自</Text>
                <Text className="about-section-text about-dev-power">@乐桃</Text>
              </View>
            </View>
          </View>

          <View className="about-footer">
            <Button
              className="about-clear-btn"
              type="text"
              size="small"
              textColor="#999"
              onClick={() => setClearVisible(true)}
            >
              清空密码
            </Button>
          </View>

          <ConfirmDialog
            visible={clearVisible}
            title="清空密码"
            content="确定要清空所有密码吗？清空后不可恢复！"
            confirmText="清空"
            confirmColor="#e64340"
            onConfirm={handleClear}
            onCancel={() => setClearVisible(false)}
          />
        </ScrollView>
      </View>
    </ThemeRoot>
  )
}

export default About
