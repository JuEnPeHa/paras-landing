import { useState } from 'react'
import axios from 'axios'
import InfiniteScroll from 'react-infinite-scroll-component'
import Head from 'next/head'

import Nav from '../../components/Nav'
import Footer from '../../components/Footer'
import UserTransactionDetail from '../../components/Activity/UserTransactionDetail'
import router from 'next/router'

const LIMIT = 5

const TopSellersPage = ({ topUser }) => {
	const [usersData, setUsersData] = useState(topUser.sellers)
	const [page, setPage] = useState(1)
	const [isFetching, setIsFetching] = useState(false)
	const [hasMore, setHasMore] = useState(true)

	const _fetchData = async () => {
		if (!hasMore || isFetching) {
			return
		}

		setIsFetching(true)
		const res = await axios(
			`${process.env.API_URL}/activities/topUsers?__skip=${
				page * LIMIT
			}__limit=${LIMIT}`
		)

		const newUserData = [...usersData, ...res.data.data.sellers]
		setUsersData(newUserData)
		setPage(page + 1)

		if (page === 5) {
			setHasMore(false)
		} else {
			setHasMore(true)
		}
		setIsFetching(false)
	}

	const headMeta = {
		title: 'Top Sellers — Paras',
		description: 'See top sellers at paras',
		image:
			'https://paras-media.s3-ap-southeast-1.amazonaws.com/paras-v2-twitter-card-large.png',
	}

	return (
		<div>
			<div
				className="min-h-screen bg-dark-primary-1"
				style={{
					backgroundImage: `linear-gradient(to bottom, #000000 0%, rgba(0, 0, 0, 0.69) 69%, rgba(0, 0, 0, 0) 100%)`,
				}}
			>
				<Head>
					<title>{headMeta.title}</title>
					<meta name="description" content={headMeta.description} />

					<meta name="twitter:title" content={headMeta.title} />
					<meta name="twitter:card" content="summary_large_image" />
					<meta name="twitter:site" content="@ParasHQ" />
					<meta name="twitter:url" content="https://paras.id" />
					<meta name="twitter:description" content={headMeta.description} />
					<meta name="twitter:image" content={headMeta.image} />
					<meta property="og:type" content="website" />
					<meta property="og:title" content={headMeta.title} />
					<meta property="og:site_name" content={headMeta.title} />
					<meta property="og:description" content={headMeta.description} />
					<meta property="og:url" content="https://paras.id" />
					<meta property="og:image" content={headMeta.image} />
				</Head>
				<Nav />
				<div className="max-w-6xl relative m-auto py-12">
					<div className="mx-4 flex items-baseline">
						<h1 className="text-4xl font-bold text-gray-100">Top Sellers</h1>
						<p className="ml-2 text-gray-400 text-lg">in 7 days</p>
					</div>
					<p className="text-gray-400 text-lg mx-4">
						see top buyers{' '}
						<span
							onClick={() => router.push('/activity/top-buyers')}
							className="font-semibold hover:text-gray-100 cursor-pointer hover:border-gray-100 border-b-2 border-transparent"
						>
							here
						</span>
					</p>
					<div className="mt-8 mx-4">
						<InfiniteScroll
							dataLength={usersData.length}
							next={_fetchData}
							hasMore={hasMore}
						>
							{usersData.map((seller, idx) => (
								<UserTransactionDetail
									type={'seller'}
									data={seller}
									key={seller._id}
									idx={idx}
								/>
							))}
						</InfiniteScroll>
					</div>
				</div>
				<Footer />
			</div>
		</div>
	)
}

export async function getServerSideProps() {
	const res = await axios(
		`${process.env.API_URL}/activities/topUsers?__limit=${LIMIT}`
	)
	const topUser = res.data.data

	return { props: { topUser } }
}

export default TopSellersPage
