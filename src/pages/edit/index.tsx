import { useEffect, useState } from 'react'
import Taro, { useRouter } from '@tarojs/taro'
import { showToast } from '@/utils/toast'
import { Password, defaultPassword } from '@/types/password'
import { usePasswords, EVENT_PASSWORDS_CHANGED } from '@/hooks/usePasswords'
import PasswordEditForm from '@/components/business/PasswordEditForm'
import Loading from '@/components/base/Loading'
import ThemeRoot from '@/components/base/ThemeRoot'
import { useNavigationBarTheme } from '@/utils/navigationBar'
import './index.scss'

/** 添加 / 编辑密码页面：由首页跳转进入，保存或取消后返回首页 */
const EditPassword = () => {
  useNavigationBarTheme()
  const router = useRouter()
  const { passwords, loading, add, update } = usePasswords(true)
  // 初始表单数据，加载完成前为 null（渲染 Loading）
  const [form, setForm] = useState<Password | null>(null)
  const [saving, setSaving] = useState(false)

  // 路由参数：带 id 表示编辑，否则为添加
  const editId = router.params.id ? Number(router.params.id) : null
  const isAdd = editId === null

  // 导航栏标题：添加 / 编辑
  useEffect(() => {
    if (process.env.TARO_ENV !== 'rn') {
      Taro.setNavigationBarTitle({ title: isAdd ? '添加密码' : '编辑密码' })
    }
  }, [isAdd])

  // 密码数据加载完成后，根据路由参数初始化表单（仅初始化一次，避免保存后 passwords 变化导致表单被重置）
  useEffect(() => {
    if (form !== null) return
    if (loading) return
    if (isAdd) {
      setForm({ ...defaultPassword, id: Date.now(), createDate: Date.now() })
      return
    }
    const target = passwords.find((p) => p.id === editId)
    if (target) {
      setForm({ ...target })
    } else {
      // 目标密码不存在（可能已被删除），提示后返回
      showToast({ title: '未找到该密码', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 800)
    }
  }, [form, loading, isAdd, editId, passwords])

  const handleSave = async (f: Password) => {
    if (!f.title.trim()) {
      showToast({ title: '标题不能为空', icon: 'none' })
      return
    }
    if (saving) return
    setSaving(true)
    const ok = isAdd ? await add(f) : await update(f)
    showToast({
      title: ok ? (isAdd ? '已添加' : '已保存') : (isAdd ? '添加失败' : '保存失败'),
      icon: ok ? 'success' : 'error',
    })
    if (ok) {
      // 通知首页等其他监听者刷新密码列表
      Taro.eventCenter.trigger(EVENT_PASSWORDS_CHANGED)
      setTimeout(() => Taro.navigateBack(), 400)
    } else {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    Taro.navigateBack()
  }

  return (
    <ThemeRoot>
      {loading || !form ? (
        <Loading />
      ) : (
        <PasswordEditForm
          form={form}
          passwords={passwords}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </ThemeRoot>
  )
}

export default EditPassword
