<script setup lang="ts">
import { ref } from 'vue'
import Card from 'primevue/card'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMInput from 'src/components/RMInput/RMInput.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { useRouter } from 'vue-router'
import { mailLogin } from '@rm/utils'
import { useSpinner } from 'src/components/RMSpinner/RMSpinner'
import { useToast } from 'src/components/RMToast/RMToast'
import { auth } from '@rm/db'

const router = useRouter()
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const bgImgPath = ref(
	'url("https://firebasestorage.googleapis.com/v0/b/recordmanagements-756bf.appspot.com/o/login%2Flogin.png?alt=media&token=51563fdb-39b2-40d3-bde2-e4ed88b675d2") no-repeat center'
)

const signIn = async () => {
	await useSpinner(async () => {
		await mailLogin(auth, email.value, password.value, router, '/RMHome')
			.then(() => {
				useToast({
					toastTitle: 'ログインしました',
					toastMovingTime: 3,
				})
				return router.push('/RMHome')
			})
			.catch((error) => {
				console.log('ログインエラー', error.code)

				if (error.code === 'auth/too-many-requests') {
					errorMessage.value =
						'入力上限に達しました。パスワードの再設定をお願いします'
					return
				}

				errorMessage.value = 'メールアドレスまたはパスワードに誤りがあります'
			})
	})
}
</script>

<template>
	<div class="login-page">
		<Card class="login-card">
			<template #content>
				<div class="login-card__content">
					<div class="login-card__logo">
						<img src="~/assets/logo.png" alt="RecordManagement logo" />
					</div>

					<RMPageHeader
						title="RecordManagement"
						subtitle="メールアドレスでログイン"
						description="検索と閲覧を素早く始められるよう、必要な入力だけを残したシンプルな導線にしています。"
						centered
					/>

					<div class="rm-form-stack">
						<RMInput
							v-model="email"
							type="text"
							label="ログインID"
							placeholder="sample@gmail.com"
							:error2="!!errorMessage"
							shadow
						/>
						<RMInput
							v-model="password"
							type="password"
							label="パスワード"
							placeholder="aa12345678"
							:error2="!!errorMessage"
							shadow
						/>
					</div>

					<p v-if="errorMessage" class="login-card__error">{{ errorMessage }}</p>

					<RMButton
						class="login-card__button"
						width="100%"
						label="ログイン"
						bgColor="linear-gradient(180deg, #A1C2E1, #4B6982)"
						@click="signIn"
					/>
				</div>
			</template>
		</Card>
	</div>
</template>

<style lang="scss" scoped>
.login-page {
	width: 100vw;
	min-height: 100vh;
	display: grid;
	place-items: center;
	padding: 18px 14px;
	background: v-bind(bgImgPath);
	background-size: cover;
}

.login-card {
	width: min(100%, 480px);
}

.login-card__content {
	display: flex;
	flex-direction: column;
	gap: 18px;
	padding: 20px 18px;
}

.login-card__logo {
	width: 132px;
	margin: 0 auto;
}

.login-card__error {
	margin: 0;
	padding: 12px 16px;
	border-radius: 16px;
	background: rgba(239, 68, 68, 0.08);
	border: 1px solid rgba(239, 68, 68, 0.2);
	text-align: center;
	font-weight: 700;
	color: var(--rm-danger);
}

.login-card__button {
	margin-top: 4px;
}

@media (min-width: 768px) {
	.login-card__content {
		padding: 24px 22px;
	}
}
</style>
