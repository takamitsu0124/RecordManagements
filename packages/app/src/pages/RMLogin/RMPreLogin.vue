<script setup lang="ts">
import { ref } from 'vue'
import Card from 'primevue/card'
import RMButton from 'src/components/RMButton/RMButton.vue'
import RMPageHeader from 'src/components/RMPageHeader/RMPageHeader.vue'
import { useRouter } from 'vue-router'

const bgImgPath = ref(
	'url("https://firebasestorage.googleapis.com/v0/b/recordmanagements-756bf.appspot.com/o/login%2Flogin.png?alt=media&token=51563fdb-39b2-40d3-bde2-e4ed88b675d2") no-repeat center'
)

const router = useRouter()
</script>

<template>
	<div class="pre-login-page">
		<Card class="pre-login-card">
			<template #content>
				<div class="pre-login-card__content">
					<div class="pre-login-card__logo">
						<img src="~/assets/logo.png" alt="RecordManagement logo" />
					</div>

					<RMPageHeader
						title="RecordManagement"
						subtitle="ギルド運営に必要な情報を、すぐ探してすぐ更新できる UI を目指しています。"
						description="アカウント作成は管理者のみ可能です。招待や登録が必要な場合は管理者へ依頼してください。"
						centered
					/>

					<RMButton
						class="pre-login-card__button"
						@click="router.push('/RMMailLogin')"
						label="メールでログイン"
						:buttonShape="'ellipse'"
						:buttonType="'standard'"
						bgColor="linear-gradient(180deg, #A1C2E1, #4B6982)"
					/>
				</div>
			</template>
		</Card>
	</div>
</template>

<style lang="scss" scoped>
.pre-login-page {
	min-height: 100vh;
	display: grid;
	place-items: center;
	padding: 18px 14px;
	background: v-bind(bgImgPath);
	background-size: cover;
}

.pre-login-card {
	width: min(100%, 560px);
}

.pre-login-card__content {
	display: flex;
	flex-direction: column;
	gap: 20px;
	padding: 22px 18px;
}

.pre-login-card__logo {
	width: 148px;
	margin: 0 auto;
}

.pre-login-card__button {
	width: 100% !important;
}

@media (min-width: 768px) {
	.pre-login-card__content {
		padding: 28px 24px;
	}
}
</style>
