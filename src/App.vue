<template>
  <div v-if="unlocked">
    <router-view/>
  </div>
  <div v-else class="gate-wrap">
    <div class="gate-card">
      <div class="gate-title">访问验证</div>
      <div class="gate-desc">请输入访问密码后进入主界面</div>
      <input v-model="password" type="password" class="gate-input" placeholder="请输入密码" @keyup.enter="unlock" />
      <button class="gate-btn" @click="unlock">进入</button>
      <div v-if="error" class="gate-error">密码错误，请重试</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const PASSWORD_HASH = '5459d67018f8cb3b4749b5e94b380915763f116560d4a58f11905550084082e5'
const STORAGE_KEY = 'fm_more_unlocked'

const unlocked = ref(false)
const password = ref('')
const error = ref(false)

async function sha256(text) {
  const data = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function unlock() {
  error.value = false
  const hash = await sha256(password.value)
  if (hash === PASSWORD_HASH) {
    unlocked.value = true
    sessionStorage.setItem(STORAGE_KEY, '1')
    password.value = ''
    return
  }
  error.value = true
}

onMounted(() => {
  unlocked.value = sessionStorage.getItem(STORAGE_KEY) === '1'
})
</script>

<style lang="stylus">
body
  margin 0
  background #0f172a
  color #e2e8f0
  font-family Arial, sans-serif

.gate-wrap
  min-height 100vh
  display flex
  align-items center
  justify-content center
  background linear-gradient(180deg, #0f172a 0%, #111827 100%)

.gate-card
  width min(420px, 92vw)
  background #1e293b
  border-radius 16px
  padding 28px
  box-shadow 0 12px 30px rgba(0,0,0,.28)

.gate-title
  font-size 28px
  font-weight 700
  margin-bottom 10px

.gate-desc
  color #94a3b8
  margin-bottom 16px

.gate-input
  width 100%
  box-sizing border-box
  padding 14px 16px
  border-radius 12px
  border none
  margin-bottom 14px
  background #0b1220
  color #e2e8f0

.gate-btn
  width 100%
  padding 12px 16px
  border-radius 12px
  border none
  background #2563eb
  color white
  cursor pointer

.gate-error
  margin-top 12px
  color #fca5a5
</style>
