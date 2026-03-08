<template>
  <div class="quiz-page">
    <div class="quiz-card">
      <div class="header">
        <h1>知识问答系统</h1>
        <p>题目：给出阀门名称，选择对应的正确厂家</p>
      </div>

      <div class="stats">
        <div class="stat-item">
          <span class="label">总题数</span>
          <span class="value">{{ totalCount }}</span>
        </div>
        <div class="stat-item">
          <span class="label">答对</span>
          <span class="value success">{{ correctCount }}</span>
        </div>
        <div class="stat-item">
          <span class="label">答错</span>
          <span class="value danger">{{ wrongCount }}</span>
        </div>
        <div class="stat-item">
          <span class="label">正确率</span>
          <span class="value primary">{{ accuracy }}%</span>
        </div>
      </div>

      <div v-if="loading" class="empty-box">题库加载中...</div>

      <div v-else-if="errorMessage" class="error-panel">
        <div class="error-title">题库加载失败</div>
        <div class="error-text">{{ errorMessage }}</div>
        <button class="btn retry" @click="loadQuestions">重新加载</button>
      </div>

      <div v-else-if="!questionBank.length" class="empty-box">
        暂无有效题目数据
      </div>

      <div v-else-if="currentQuestion" class="question-box">
        <div class="question-top">
          <div class="question-number">
            第 {{ totalCount + 1 }} 题
          </div>
          <div class="question-progress">
            题库：{{ questionBank.length }} 题
          </div>
        </div>

        <div class="question-title">
          下列厂家中，哪个是阀门
          <span class="highlight">“{{ currentQuestion.valveName }}”</span>
          的正确厂家？
        </div>

        <div class="options">
          <label
            v-for="option in currentQuestion.options"
            :key="option"
            class="option-item"
            :class="getOptionClass(option)"
          >
            <input
              type="checkbox"
              :value="option"
              v-model="selectedManufacturers"
              :disabled="answered"
            />
            <span>{{ option }}</span>
          </label>
        </div>

        <div class="actions">
          <button
            class="btn submit"
            @click="submitAnswer"
            :disabled="answered || selectedManufacturers.length === 0"
          >
            提交答案
          </button>
          <button class="btn next" @click="nextQuestion">
            下一题
          </button>
          <button class="btn reset" @click="resetQuiz">
            重新开始
          </button>
        </div>

        <div
          v-if="answered"
          class="result-box"
          :class="isCorrect ? 'success' : 'error'"
        >
          <div class="result-title">
            {{ isCorrect ? '回答正确' : '回答错误' }}
          </div>

          <div class="result-text">
            你的答案：
            <span v-if="selectedManufacturers.length">
              {{ selectedManufacturers.join('、') }}
            </span>
            <span v-else>未选择</span>
          </div>

          <div class="result-text">
            正确答案：
            <strong>{{ currentQuestion.correctManufacturers.join('、') }}</strong>
          </div>
        </div>
      </div>

      <div v-else class="empty-box">
        暂无题目数据
      </div>
    </div>
  </div>
</template>

<script setup>
import axios from 'axios'
import { computed, ref, onMounted } from 'vue'
import request from '@/utils/request'
/**
 * 接口返回示例：
 * [
 *   { name: '七星大街四环北', manufacturer: '上海冠龙阀门' },
 *   { name: '和平大街阀门1', manufacturer: '天津大站阀门' }
 * ]
 */

const questionBank = ref([])
const currentQuestion = ref(null)
const selectedManufacturers = ref([])
const answered = ref(false)
const isCorrect = ref(false)

const totalCount = ref(0)
const correctCount = ref(0)
const wrongCount = ref(0)

const loading = ref(false)
const errorMessage = ref('')
const usedQuestionKeys = ref([])

const accuracy = computed(() => {
  if (totalCount.value === 0) return 0
  return ((correctCount.value / totalCount.value) * 100).toFixed(0)
})

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function normalizeQuestionItem(item) {
  const valveName = String(item?.name || '').trim()
  const manufacturer = String(item?.manufacturer || '').trim()

  return {
    valveName,
    manufacturer,
    key: `${valveName}__${manufacturer}`
  }
}

function getAllManufacturers() {
  return [
    ...new Set(
      questionBank.value
        .map(item => item.manufacturer)
        .filter(item => !!item)
    )
  ]
}

function buildOptions(correctManufacturer) {
  const allManufacturers = getAllManufacturers().filter(
    item => item !== correctManufacturer
  )

  const wrongOptions = shuffle(allManufacturers).slice(0, 3)
  const options = shuffle([correctManufacturer, ...wrongOptions])

  return [...new Set(options)]
}

function pickUnusedQuestion() {
  const unused = questionBank.value.filter(
    item => !usedQuestionKeys.value.includes(item.key)
  )

  if (!unused.length) {
    usedQuestionKeys.value = []
    return questionBank.value[Math.floor(Math.random() * questionBank.value.length)]
  }

  return unused[Math.floor(Math.random() * unused.length)]
}

function generateQuestion() {
  if (!questionBank.value.length) {
    currentQuestion.value = null
    return
  }

  const current = pickUnusedQuestion()

  if (!current || !current.manufacturer) {
    currentQuestion.value = null
    return
  }

  const options = buildOptions(current.manufacturer)

  currentQuestion.value = {
    key: current.key,
    valveName: current.valveName,
    correctManufacturers: [current.manufacturer],
    options
  }

  selectedManufacturers.value = []
  answered.value = false
  isCorrect.value = false

  if (!usedQuestionKeys.value.includes(current.key)) {
    usedQuestionKeys.value.push(current.key)
  }
}

async function loadQuestions() {
  loading.value = true
  errorMessage.value = ''

  try {
    const res =request.get('/v1/querybillInfoweb')


    // 兼容几种常见返回结构
    const rawList =
      res?.data?.data ||
      res?.data?.rows ||
      res?.data?.list ||
      res?.data ||
      []

    if (!Array.isArray(rawList)) {
      throw new Error('接口返回的数据不是数组格式')
    }

    const parsedList = rawList
      .map(normalizeQuestionItem)
      .filter(item => item.valveName && item.manufacturer)

    if (!parsedList.length) {
      throw new Error('接口返回成功，但没有可用题目，请检查 manufacturer 是否为空')
    }

    questionBank.value = parsedList
    usedQuestionKeys.value = []
    generateQuestion()
  } catch (err) {
    console.error('加载题库失败:', err)
    errorMessage.value =
      err?.response?.data?.message ||
      err?.message ||
      '接口请求失败，请检查代理、跨域或接口返回格式'
    questionBank.value = []
    currentQuestion.value = null
  } finally {
    loading.value = false
  }
}

function submitAnswer() {
  if (answered.value || !currentQuestion.value) return

  const userAnswer = [...selectedManufacturers.value].sort()
  const correctAnswer = [...currentQuestion.value.correctManufacturers].sort()

  const sameLength = userAnswer.length === correctAnswer.length
  const sameContent =
    sameLength &&
    userAnswer.every((item, index) => item === correctAnswer[index])

  isCorrect.value = sameContent
  answered.value = true
  totalCount.value++

  if (sameContent) {
    correctCount.value++
  } else {
    wrongCount.value++
  }
}

function nextQuestion() {
  generateQuestion()
}

function resetQuiz() {
  totalCount.value = 0
  correctCount.value = 0
  wrongCount.value = 0
  usedQuestionKeys.value = []
  generateQuestion()
}

function getOptionClass(option) {
  if (!answered.value) {
    return {
      selected: selectedManufacturers.value.includes(option)
    }
  }

  const isSelected = selectedManufacturers.value.includes(option)
  const isAnswer = currentQuestion.value?.correctManufacturers.includes(option)

  return {
    disabled: true,
    selected: isSelected,
    correct: isAnswer,
    wrong: isSelected && !isAnswer
  }
}

onMounted(() => {
  loadQuestions()
})
</script>

<style scoped>
.quiz-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fb 0%, #eef2f7 100%);
  padding: 32px 16px;
}

.quiz-card {
  max-width: 820px;
  margin: 0 auto;
  background: #fff;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

.header h1 {
  margin: 0 0 10px;
  font-size: 30px;
  color: #1f2937;
}

.header p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}

.stat-item {
  background: #f8fafc;
  border-radius: 14px;
  padding: 16px;
  text-align: center;
  border: 1px solid #e5e7eb;
}

.label {
  display: block;
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 8px;
}

.value {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
}

.value.success {
  color: #16a34a;
}

.value.danger {
  color: #dc2626;
}

.value.primary {
  color: #2563eb;
}

.question-box {
  background: #fcfcfd;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: 24px;
}

.question-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.question-number,
.question-progress {
  display: inline-block;
  background: #eff6ff;
  color: #2563eb;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
}

.question-title {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  line-height: 1.7;
  margin-bottom: 22px;
}

.highlight {
  color: #d97706;
}

.options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 24px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid #d1d5db;
  border-radius: 14px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-item:hover {
  border-color: #2563eb;
  transform: translateY(-1px);
}

.option-item.selected {
  border-color: #2563eb;
  background: #eff6ff;
}

.option-item.correct {
  border-color: #16a34a;
  background: #f0fdf4;
}

.option-item.wrong {
  border-color: #dc2626;
  background: #fef2f2;
}

.option-item.disabled {
  cursor: not-allowed;
  opacity: 0.96;
}

.option-item input {
  width: 18px;
  height: 18px;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.btn {
  border: none;
  border-radius: 12px;
  padding: 12px 22px;
  font-size: 15px;
  cursor: pointer;
  transition: 0.2s ease;
}

.btn.submit {
  background: #2563eb;
  color: #fff;
}

.btn.submit:hover {
  background: #1d4ed8;
}

.btn.submit:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.btn.next {
  background: #10b981;
  color: #fff;
}

.btn.next:hover {
  background: #059669;
}

.btn.reset {
  background: #f59e0b;
  color: #fff;
}

.btn.reset:hover {
  background: #d97706;
}

.btn.retry {
  background: #2563eb;
  color: #fff;
  margin-top: 12px;
}

.result-box {
  border-radius: 14px;
  padding: 16px 18px;
  margin-top: 8px;
}

.result-box.success {
  background: #f0fdf4;
  border: 1px solid #86efac;
}

.result-box.error {
  background: #fef2f2;
  border: 1px solid #fca5a5;
}

.result-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 10px;
}

.result-box.success .result-title {
  color: #15803d;
}

.result-box.error .result-title {
  color: #b91c1c;
}

.result-text {
  color: #374151;
  line-height: 1.8;
}

.empty-box {
  text-align: center;
  padding: 40px 0;
  color: #9ca3af;
}

.error-panel {
  border: 1px solid #fecaca;
  background: #fff1f2;
  border-radius: 16px;
  padding: 24px;
  text-align: center;
}

.error-title {
  font-size: 20px;
  font-weight: 700;
  color: #b91c1c;
  margin-bottom: 10px;
}

.error-text {
  color: #7f1d1d;
  line-height: 1.7;
}

@media (max-width: 768px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .options {
    grid-template-columns: 1fr;
  }

  .question-title {
    font-size: 18px;
  }

  .quiz-card {
    padding: 20px;
  }
}
</style>