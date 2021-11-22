import axios from 'axios'
import CardList from 'components/TokenSeries/CardList'
import CardListLoader from 'components/Card/CardListLoader'
import Button from 'components/Common/Button'
import FilterMarket from 'components/Filter/FilterMarket'
import Footer from 'components/Footer'
import Nav from 'components/Nav'
import useStore from 'lib/store'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { parseImgUrl, parseSortQuery } from 'utils/common'
import { parseNearAmount } from 'near-api-js/lib/utils/format'

const LIMIT = 8

const CollectionPage = ({ collectionId, collection, serverQuery }) => {
	const currentUser = useStore((store) => store.currentUser)
	const router = useRouter()

	const [tokens, setTokens] = useState([])
	const [page, setPage] = useState(0)
	const [isFetching, setIsFetching] = useState(false)
	const [isFiltering, setIsFiltering] = useState(false)
	const [hasMore, setHasMore] = useState(true)

	const fetchData = async () => {
		if (!hasMore || isFetching) {
			return
		}
		setIsFetching(true)
		const res = await axios(`${process.env.V2_API_URL}/token-series`, {
			params: tokensParams(page, router.query || serverQuery),
		})
		const newData = await res.data.data
		const newTokens = [...tokens, ...newData.results]
		setTokens(newTokens)
		setPage(page + 1)
		if (newData.results.length < LIMIT) {
			setHasMore(false)
		} else {
			setHasMore(true)
		}
		setIsFetching(false)
	}

	const headMeta = {
		title: collection.collection,
		description: collection.description,
		image: parseImgUrl(collection.media, null, { useOriginal: true }),
	}

	useEffect(() => {
		fetchData()
	}, [])

	useEffect(() => {
		updateFilter(router.query)
	}, [router.query.sort, router.query.pmin, router.query.pmax])

	const editCollection = () => {
		router.push(`/collection/edit/${collectionId}`)
	}

	const addCard = () => {
		router.push('/new')
	}

	const tokensParams = (_page = 0, query) => {
		const params = {
			collection_id: collectionId,
			exclude_total_burn: true,
			__skip: _page * LIMIT,
			__limit: LIMIT,
			__sort: query ? parseSortQuery(query.sort) : null,
			...(query.pmin && { min_price: parseNearAmount(query.pmin) }),
			...(query.pmax && { max_price: parseNearAmount(query.pmax) }),
		}

		return params
	}

	const updateFilter = async (query) => {
		setIsFiltering(true)
		const res = await axios(`${process.env.V2_API_URL}/token-series`, {
			params: tokensParams(0, query || serverQuery),
		})
		setPage(1)
		setTokens(res.data.data.results)
		if (res.data.data.results.length < LIMIT) {
			setHasMore(false)
		} else {
			setHasMore(true)
		}

		setIsFiltering(false)
	}

	return (
		<div className="min-h-screen bg-black">
			<div
				className="fixed inset-0 opacity-75"
				style={{
					zIndex: 0,
					backgroundImage: `url('/bg.jpg')`,
					backgroundRepeat: 'no-repeat',
					backgroundSize: 'cover',
				}}
			></div>
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
				<div className="flex items-center m-auto justify-center mb-4">
					<div className="w-32 h-32 overflow-hidden bg-primary shadow-inner">
						<img
							src={parseImgUrl(collection?.media, null, {
								width: `300`,
							})}
							className="w-full object-cover"
						/>
					</div>
				</div>
				<h1 className="text-4xl font-bold text-gray-100 mx-4 text-center">
					{collection?.collection}
				</h1>
				<div className="m-4 mt-0 text-center relative">
					<h4 className="text-xl text-gray-300 self-center">
						<span>
							collection by{' '}
							<span className="font-semibold">
								<Link href={`/${collection?.creator_id}/creation`}>
									<a className="font-semibold text-white border-b-2 border-transparent hover:border-white">
										{collection?.creator_id}
									</a>
								</Link>
							</span>
						</span>
					</h4>
					<p className="text-gray-200 mt-4 max-w-lg m-auto">{collection?.description}</p>
					{currentUser === collection.creator_id && (
						<div className="flex flex-row space-x-2 max-w-xs m-auto mt-4">
							<Button onClick={addCard} size="md" className="w-40 m-auto">
								Add Card
							</Button>
							<Button
								onClick={editCollection}
								variant="secondary"
								size="md"
								className="w-40 m-auto"
							>
								Edit
							</Button>
						</div>
					)}
				</div>
				<div className="md:ml-8 z-10 flex items-end justify-end">
					<FilterMarket isShowVerified={false} />
				</div>
				<div className="mt-12 px-4">
					{isFiltering ? (
						<CardListLoader />
					) : (
						<CardList name="market" tokens={tokens} fetchData={fetchData} hasMore={hasMore} />
					)}
				</div>
			</div>
			<Footer />
		</div>
	)
}

export default CollectionPage

export async function getServerSideProps({ params }) {
	const resp = await axios.get(`${process.env.V2_API_URL}/collections`, {
		params: {
			collection_id: params.collection_id,
		},
	})

	return {
		props: {
			collectionId: params.collection_id,
			collection: resp.data.data.results[0],
			serverQuery: params,
		},
	}
}
