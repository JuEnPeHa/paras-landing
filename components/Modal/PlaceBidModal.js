import { useForm } from 'react-hook-form'
import useStore from 'lib/store'
import { prettyBalance } from 'utils/common'
import { useIntl } from 'hooks/useIntl'
import Modal from 'components/Common/Modal'
import Button from 'components/Common/Button'
import { InputText } from 'components/Common/form'
import near from 'lib/near'
import { sentryCaptureException } from 'lib/sentry'
import { GAS_FEE, STORAGE_ADD_MARKET_FEE } from 'config/constants'
import { parseNearAmount } from 'near-api-js/lib/utils/format'
import { transactions } from 'near-api-js'
import JSBI from 'jsbi'
import { IconX } from 'components/Icons'
import { useEffect } from 'react'

const PlaceBidModal = ({
	data,
	show,
	onClose,
	isSubmitting,
	bidAmount,
	bidQuantity,
	isUpdate = false,
}) => {
	const { localeLn } = useIntl()
	const { errors, register, handleSubmit, watch } = useForm({
		defaultValues: {
			bidAmount,
			bidQuantity,
		},
	})
	const { currentUser, userBalance } = useStore((state) => ({
		currentUser: state.currentUser,
		userBalance: state.userBalance,
	}))

	useEffect(async () => {
		if (show) {
			try {
				const params = {
					nft_contract_id: data.contract_id,
					buyer_id: currentUser,
					...(data.token_id
						? { token_id: data.token_id }
						: { token_series_id: data.token_series_id }),
				}
				const tet = await near.wallet
					.account()
					.viewFunction(process.env.MARKETPLACE_CONTRACT_ID, `get_offer`, params)
				console.log('has been offered', tet)
			} catch (err) {
				sentryCaptureException(err)
			}
		}
	}, [show])

	const hasStorageBalance = async (token) => {
		try {
			if (!token.approval_id) {
				const currentStorage = await near.wallet
					.account()
					.viewFunction(process.env.MARKETPLACE_CONTRACT_ID, `storage_balance_of`, {
						account_id: currentUser,
					})

				const supplyPerOwner = await near.wallet
					.account()
					.viewFunction(process.env.MARKETPLACE_CONTRACT_ID, `get_supply_by_owner_id`, {
						account_id: currentUser,
					})

				const usedStorage = JSBI.multiply(
					JSBI.BigInt(parseInt(supplyPerOwner) + 1),
					JSBI.BigInt(STORAGE_ADD_MARKET_FEE)
				)

				if (JSBI.greaterThanOrEqual(JSBI.BigInt(currentStorage), usedStorage)) {
					return true
				}
				return false
			} else {
				return true
			}
		} catch (err) {
			sentryCaptureException(err)
		}
	}

	const onPlaceBid = async ({ bidAmount }) => {
		const hasDepositStorage = await hasStorageBalance(data)

		try {
			const depositParams = {
				receiver_id: near.currentUser.accountId,
			}

			const params = {
				nft_contract_id: data.contract_id,
				...(data.token_id
					? { token_id: data.token_id }
					: { token_series_id: data.token_series_id }),
				token_series_id: data.token_series_id,
				ft_token_id: 'near',
				price: parseNearAmount(bidAmount),
			}

			if (hasDepositStorage) {
				await near.wallet.account(process.env.MARKETPLACE_CONTRACT_ID).signAndSendTransaction({
					receiverId: process.env.MARKETPLACE_CONTRACT_ID,
					actions: [
						transactions.functionCall(`add_offer`, params, GAS_FEE, parseNearAmount(bidAmount)),
					],
				})
			} else {
				await near.wallet.account(process.env.MARKETPLACE_CONTRACT_ID).signAndSendTransaction({
					receiverId: process.env.MARKETPLACE_CONTRACT_ID,
					actions: [
						transactions.functionCall(
							`storage_deposit`,
							depositParams,
							GAS_FEE,
							STORAGE_ADD_MARKET_FEE
						),
						transactions.functionCall(`add_offer`, params, GAS_FEE, parseNearAmount(bidAmount)),
					],
				})
			}
		} catch (err) {
			sentryCaptureException(err)
		}
	}

	return (
		<Modal isShow={show} close={onClose} closeOnBgClick={false} closeOnEscape={false}>
			<div className="max-w-sm w-full p-4 bg-gray-800  m-auto rounded-md relative">
				<div className="absolute right-0 top-0 pr-4 pt-4">
					<div className="cursor-pointer" onClick={onClose}>
						<IconX />
					</div>
				</div>
				<div>
					<h1 className="text-2xl font-bold text-white tracking-tight">
						{isUpdate ? 'Update My Bid' : 'Place an Offer'}
					</h1>
					<p className="text-white mt-2">
						{localeLn('You are about to bid')} <b>{data.metadata.title}</b>.
					</p>
					<form onSubmit={handleSubmit(onPlaceBid)}>
						<div className="mt-4 ">
							<label className="block text-sm mb-2 text-white opacity-90">
								{localeLn('Amount in')} Ⓝ
							</label>
							<InputText
								name="bidAmount"
								type="number"
								step="any"
								ref={register({
									required: true,
									min: 0.01,
									max: parseFloat(prettyBalance(userBalance.available, 24, 4)),
								})}
								className={`${errors.bidAmount && 'error'}`}
								placeholder="Place your bid"
							/>
							<div className="mt-2 text-sm text-red-500">
								{errors.bidAmount?.type === 'required' && `Bid mmount is required`}
								{errors.bidAmount?.type === 'min' && `Minimum 0.01 Ⓝ`}
								{errors.bidAmount?.type === 'max' && `You don't have enough balance`}
							</div>
						</div>
						<div className="mt-4 text-center text-white opacity-90">
							<div className="flex justify-between">
								<div className="text-sm">Your balance</div>
								<div>{prettyBalance(userBalance.available, 24, 4)} Ⓝ</div>
							</div>
							<div className="flex justify-between">
								<div className="text-sm">{localeLn('Total bid Amount')}</div>
								<div>{watch('bidAmount', bidAmount || 0)} Ⓝ</div>
							</div>
						</div>
						<p className="text-white opacity-80 mt-4 text-sm text-center">
							{localeLn('You will be redirected to NEAR Web Wallet to confirm your transaction')}
						</p>
						<div className="">
							<Button disabled={isSubmitting} className="mt-4" isFullWidth type="submit" size="md">
								{isSubmitting ? localeLn('Redirecting...') : localeLn('Submit Bid')}
							</Button>
						</div>
					</form>
				</div>
			</div>
		</Modal>
	)
}

export default PlaceBidModal