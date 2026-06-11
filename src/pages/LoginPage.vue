<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { signIn } = useAuth()

const formRef = ref(null)
const submitting = ref(false)
const form = reactive({
  username: 'admin',
  password: '',
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
  ],
}

function resolveRedirect() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  if (!redirect || redirect === '/login') {
    return '/dashboard'
  }
  return redirect
}

async function handleSubmit() {
  if (!formRef.value) {
    return
  }

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    await signIn({
      username: form.username,
      password: form.password,
    })
    ElMessage.success('登录成功')
    await router.replace(resolveRedirect())
  } catch (error) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <section class="login-shell">
      <div class="login-brand-panel">
        <div class="login-brand-chip">OPS INSPECTION</div>
        <div class="login-brand-copy">
          <p class="login-kicker">AUTH GATE</p>
          <h1 class="login-title">巡检入口<br>控制台登录</h1>
          <p class="login-description">
            进入资源巡检、Java 巡检、图模统计和服务器终端前，先完成本地会话认证。
          </p>
        </div>

        <div class="login-brand-list">
          <div class="login-brand-item">
            <span>01</span>
            <strong>服务器巡检支撑</strong>
          </div>
          <div class="login-brand-item">
            <span>02</span>
            <strong>会话连接保持</strong>
          </div>
          <div class="login-brand-item">
            <span>03</span>
            <strong>程序异常检测</strong>
          </div>
        </div>
      </div>

      <div class="login-form-panel">
        <div class="login-form-card">
          <p class="login-panel-kicker">WELCOME BACK</p>
          <h2 class="login-panel-title">登录巡检系统</h2>
          <p class="login-panel-description">当前固定账号为 `admin`，输入密码后进入工作台。</p>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-position="top"
            class="login-form"
            @submit.prevent="handleSubmit"
          >
            <el-form-item label="用户名" prop="username">
              <el-input v-model="form.username" size="large" autocomplete="username" />
            </el-form-item>

            <el-form-item label="密码" prop="password">
              <el-input
                v-model="form.password"
                type="password"
                size="large"
                show-password
                autocomplete="current-password"
                @keyup.enter="handleSubmit"
              />
            </el-form-item>

            <button type="submit" class="login-submit" :disabled="submitting" @click.prevent="handleSubmit">
              {{ submitting ? '登录中...' : '登录系统' }}
            </button>
          </el-form>

          <div class="login-helper">
            <span>登录后会自动回到你刚才访问的页面。</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  padding: 18px;
}

.login-shell {
  min-height: calc(100vh - 36px);
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(380px, 0.92fr);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(30, 41, 59, 0.08);
  box-shadow: 0 8px 32px rgba(30, 41, 59, 0.1);
  background: rgba(255, 255, 255, 0.95);
}

.login-brand-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 24px;
  padding: 36px 34px 30px;
  color: #f1f5f9;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.2), transparent 24%),
    linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
}

.login-brand-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  font-size: 11px;
  letter-spacing: 0.18em;
}

.login-brand-copy {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-kicker,
.login-panel-kicker {
  margin: 0;
  color: rgba(241, 245, 249, 0.62);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.login-title {
  margin: 0;
  font-size: 42px;
  line-height: 1;
  letter-spacing: 0.08em;
}

.login-description {
  margin: 0;
  max-width: 440px;
  color: rgba(241, 245, 249, 0.74);
  font-size: 14px;
  line-height: 1.7;
}

.login-brand-list {
  display: grid;
  gap: 12px;
}

.login-brand-item {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
}

.login-brand-item span {
  color: rgba(226, 232, 240, 0.44);
  font-size: 18px;
  font-weight: 700;
}

.login-brand-item strong {
  font-size: 14px;
  letter-spacing: 0.05em;
}

.login-form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.98));
}

.login-form-card {
  width: min(420px, 100%);
  padding: 32px 28px;
  border-radius: 16px;
  border: 1px solid rgba(30, 41, 59, 0.06);
  background: #ffffff;
  box-shadow: 0 4px 24px rgba(30, 41, 59, 0.08);
}

.login-panel-kicker {
  color: var(--brand);
}

.login-panel-title {
  margin: 10px 0 0;
  font-size: 28px;
  letter-spacing: 0.06em;
  color: var(--text-main);
}

.login-panel-description {
  margin: 10px 0 0;
  color: var(--text-subtle);
  font-size: 13px;
  line-height: 1.7;
}

.login-form {
  margin-top: 24px;
}

.login-submit {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--brand), var(--brand-strong));
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.login-submit:hover:enabled {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.25);
}

.login-submit:disabled {
  opacity: 0.7;
  cursor: wait;
}

.login-helper {
  margin-top: 14px;
  color: var(--text-subtle);
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 960px) {
  .login-page {
    padding: 12px;
  }

  .login-shell {
    min-height: calc(100vh - 24px);
    grid-template-columns: 1fr;
  }

  .login-brand-panel {
    padding: 28px 22px;
  }

  .login-title {
    font-size: 30px;
  }

  .login-form-panel {
    padding: 18px;
  }
}
</style>
