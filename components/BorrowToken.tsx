import {
  getTokenBySymbol,
  getWeights,
  I80F48,
  ONE_I80F48,
  QUOTE_INDEX,
} from '@blockworks-foundation/mango-client'
import { Disclosure } from '@headlessui/react'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/solid'
import { PublicKey } from '@solana/web3.js'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import useMangoStore, { WalletToken } from '../stores/useMangoStore'
import { depositAndWithdraw } from '../utils/mango'
import Button from './Button'
import Input from './Input'

const BorrowToken = () => {
  // load
  const mangoGroup = useMangoStore((s) => s.selectedMangoGroup.current)
  const mangoGroupConfig = useMangoStore((s) => s.selectedMangoGroup.config)
  const mangoCache = useMangoStore((s) => s.selectedMangoGroup.cache)
  const mangoAccount = useMangoStore((s) => s.selectedMangoAccount.current)
  const walletTokens = useMangoStore((s) => s.wallet.tokens)

  // parse symbols from path
  const router = useRouter()
  let borrowSymbol = router.query.borrow as string
  if (borrowSymbol) {
    borrowSymbol = borrowSymbol.toUpperCase()
  }
  let collateralSymbol = router.query.collateral as string
  if (collateralSymbol) {
    collateralSymbol = collateralSymbol.toUpperCase()
  }

  const [invalidAmountMessage, setInvalidAmountMessage] = useState('')

  // collateral
  const [collateralAccount, setCollateralAccount] = useState<WalletToken>(null)
  const [collateralInput, setCollateralInput] = useState<number>(0)
  useEffect(() => {
    if (collateralSymbol) {
      const collateralAccount = walletTokens.find(
        (a) => a.config.symbol === collateralSymbol
      )
      if (collateralAccount) {
        setCollateralAccount(collateralAccount)
      } else {
        setCollateralAccount(null)
      }
    }
  }, [collateralSymbol, walletTokens])

  // borrow
  const [borrowTokenMint, setBorrowTokenMint] = useState<PublicKey>(null)
  const [borrowInput, setBorrowInput] = useState<number>(0)
  useEffect(() => {
    if (borrowSymbol) {
      const borrowTokenConfig = mangoGroupConfig.tokens.find(
        (token) => token.symbol === borrowSymbol
      )
      if (borrowTokenConfig) {
        setBorrowTokenMint(borrowTokenConfig.mintKey)
      } else {
        setBorrowTokenMint(null)
      }
    }
  }, [borrowSymbol])

  // collateral form
  const setMaxForCollateral = () => {
    if (collateralAccount) {
      // todo if sol, leave some amount in account
      const maxColleralAmount = collateralAccount.uiBalance
      onChangeAmountCollateralInput(maxColleralAmount)
    }
  }

  const validateCollateralInput = (collateralAmount) => {
    if (Number(collateralAmount) <= 0) {
      setInvalidAmountMessage('Enter a valid collateral amount to deposit!')
    } else {
      setInvalidAmountMessage(null)
    }
  }

  const onChangeAmountCollateralInput = (collateralAmount) => {
    setCollateralInput(collateralAmount)

    if (collateralAmount >= 0) {
      setBorrowInput(getMaxBorrowForCollateral().toNumber())
    }
  }

  const getMaxBorrowForCollateral = () => {
    const collaterlToken = getTokenBySymbol(mangoGroupConfig, collateralSymbol)
    const collateralTokenIndex = mangoGroup.getTokenIndex(
      collaterlToken.mintKey
    )
    const w = getWeights(mangoGroup, collateralTokenIndex, 'Init')
    const collateralPrice = mangoCache.priceCache[collateralTokenIndex].price
    const collateralInputNative = I80F48.fromNumber(
      Math.round(
        collateralInput *
          Math.pow(10, mangoGroup.tokens[collateralTokenIndex].decimals)
      )
    )
    const collateralBasedInitHealth = collateralInputNative
      .mul(collateralPrice)
      .mul(w.spotAssetWeight)

    const borrowToken = getTokenBySymbol(mangoGroupConfig, borrowSymbol)
    const borrowTokenIndex = mangoGroup.getTokenIndex(borrowToken.mintKey)
    let liabWeight
    if (borrowTokenIndex === QUOTE_INDEX) {
      liabWeight = ONE_I80F48
    } else {
      liabWeight = mangoGroup.spotMarkets[borrowTokenIndex].initLiabWeight
    }
    const borrowPrice = mangoGroup.getPrice(borrowTokenIndex, mangoCache)
    const healthDecimals = I80F48.fromNumber(
      Math.pow(10, mangoGroup.tokens[borrowTokenIndex].decimals)
    )
    return collateralBasedInitHealth
      .div(healthDecimals)
      .div(borrowPrice.mul(liabWeight))
  }

  // borrow form
  const onChangeAmountBorrowInput = (borrowInput) => {
    setBorrowInput(borrowInput)
  }

  // misc.
  const [collateralPrice, setCollateralPrice] = useState<number>(null)
  const [collateralUsd, setCollateralUsd] = useState<number>(null)
  const [borrowUsd, setBorrowUsd] = useState<number>(null)
  const [borrowPrice, setBorrowPrice] = useState<number>(null)
  const [leverage, setLeverage] = useState<number>(null)
  const [borrowApr, setBorrowApr] = useState<number>(null)

  useEffect(() => {
    if (!(collateralSymbol && borrowSymbol)) {
      return
    }

    const collaterlToken = getTokenBySymbol(mangoGroupConfig, collateralSymbol)
    const collateralTokenIndex = mangoGroup.getTokenIndex(
      collaterlToken.mintKey
    )
    const collateralPrice = mangoCache.priceCache[
      collateralTokenIndex
    ].price.mul(
      I80F48.fromNumber(
        Math.pow(
          10,
          mangoGroup.tokens[collateralTokenIndex].decimals -
            mangoGroup.tokens[QUOTE_INDEX].decimals
        )
      )
    )

    const borrowToken = getTokenBySymbol(mangoGroupConfig, borrowSymbol)
    const borrowTokenIndex = mangoGroup.getTokenIndex(borrowToken.mintKey)
    const borrowPrice = mangoGroup.getPrice(borrowTokenIndex, mangoCache)

    console.log(`collateralPrice - ${collateralPrice.toNumber()}`)
    console.log(`Collateral - ${collateralInput} ${collateralSymbol}`)
    console.log(
      `Collateral USD - ${I80F48.fromNumber(collateralInput).mul(
        collateralPrice
      )} `
    )
    console.log(`Borrow - ${borrowInput} ${borrowSymbol}`)
    console.log(`Borrow USD - ${borrowInput * borrowPrice.toNumber()}`)
    console.log(
      `Leverage - ${
        (borrowInput * borrowPrice.toNumber()) /
        I80F48.fromNumber(collateralInput).mul(collateralPrice).toNumber()
      }`
    )
    console.log(
      `Borrow APR - ${(
        mangoGroup.getBorrowRate(borrowTokenIndex).toNumber() * 100
      ).toFixed(2)}`
    )
    console.log()

    setCollateralPrice(collateralPrice.toNumber())
    setCollateralUsd(collateralInput * collateralPrice.toNumber())
    setBorrowPrice(borrowPrice.toNumber())
    setBorrowUsd(borrowInput * borrowPrice.toNumber())
    setLeverage(
      (borrowInput * borrowPrice.toNumber()) /
        I80F48.fromNumber(collateralInput).mul(collateralPrice).toNumber()
    )
    setBorrowApr(mangoGroup.getBorrowRate(borrowTokenIndex).toNumber() * 100)
  }, [borrowInput, collateralInput])

  // withdraw
  const handleWithdraw = () => {
    depositAndWithdraw(
      mangoAccount,
      collateralSymbol,
      collateralInput,
      collateralAccount.account,
      borrowSymbol,
      borrowInput,
      borrowTokenMint,
      true
    )
  }

  return (
    <div className="container grid grid-cols-3">
      <div className="">
        <div className="flex flex-col sm:flex-row pt-8 pb-3 sm:pb-6 md:pt-10">
          <h1 className={`text-th-fgd-1 text-2xl font-semibold`}>
            Borrow {borrowSymbol && borrowSymbol}
          </h1>
        </div>

        <div className="flex justify-between pb-2 pt-4">
          <div className={`text-th-fgd-1`}>Collateral from wallet</div>
          <div
            className="text-th-fgd-1 underline cursor-pointer default-transition hover:text-th-primary hover:no-underline"
            onClick={setMaxForCollateral}
          >
            Max
          </div>
        </div>
        <div className="flex">
          <Input
            type="number"
            min="0"
            className={`border border-th-fgd-4 flex-grow pr-11`}
            placeholder={collateralInput}
            error={!!invalidAmountMessage}
            onBlur={(e) => validateCollateralInput(e.target.value)}
            onChange={(e) => onChangeAmountCollateralInput(e.target.value)}
            value={collateralInput}
            suffix={collateralSymbol}
          />
        </div>
        {invalidAmountMessage ? (
          <div className="flex items-center pt-1.5 text-th-red">
            <ExclamationCircleIcon className="h-4 w-4 mr-1.5" />
            {invalidAmountMessage}
          </div>
        ) : null}

        <div className="flex justify-between pb-2 pt-4">
          <div className={`text-th-fgd-1`}>Borrow to wallet</div>
        </div>
        <div className="flex">
          <Input
            type="number"
            min="0"
            className={`border border-th-fgd-4 flex-grow pr-11`}
            placeholder={borrowInput}
            error={!!invalidAmountMessage}
            onBlur={(e) => validateCollateralInput(e.target.value)}
            value={borrowInput}
            onChange={(e) => onChangeAmountBorrowInput(e.target.value)}
            suffix={borrowSymbol}
          />
        </div>

        <Disclosure>
          {({ open }) => (
            <>
              <Disclosure.Button
                className={`border border-th-fgd-4 default-transition font-normal mt-4 pl-3 pr-2 py-2.5 ${
                  open ? 'rounded-b-none' : 'rounded-md'
                } text-th-fgd-1 w-full hover:bg-th-bkg-3 focus:outline-none`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="flex h-2 w-2 mr-2.5 relative">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75`}
                      ></span>
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2`}
                      ></span>
                    </span>
                    Borrow Transaction Review
                  </div>
                  {open ? (
                    <ChevronUpIcon className="h-5 w-5 mr-1" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 mr-1" />
                  )}
                </div>
              </Disclosure.Button>
              <Disclosure.Panel
                className={`border border-th-fgd-4 border-t-0 p-4 rounded-b-md`}
              >
                <div>
                  <div className="flex justify-between pb-2">
                    <div className="text-th-fgd-4">Collateral Price</div>
                    <div className="text-th-fgd-1">{collateralPrice}</div>
                  </div>

                  <div className="flex justify-between pb-2">
                    <div className="text-th-fgd-4">Collateral USD Value</div>
                    <div className="text-th-fgd-1">{collateralUsd}</div>
                  </div>

                  <div className="flex justify-between pb-2">
                    <div className="text-th-fgd-4">Borrow Price</div>
                    <div className="text-th-fgd-1">{borrowPrice}</div>
                  </div>

                  <div className="flex justify-between pb-2">
                    <div className="text-th-fgd-4">Borrow USD Value</div>
                    <div className="text-th-fgd-1">{borrowUsd}</div>
                  </div>

                  <div className="flex justify-between pb-2">
                    <div className="text-th-fgd-4">Leverage</div>
                    <div className="text-th-fgd-1">{leverage}</div>
                  </div>

                  <div className="flex justify-between pb-2">
                    <div className="text-th-fgd-4">Borrow APR</div>
                    <div className="text-th-fgd-1">{borrowApr}</div>
                  </div>
                </div>
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>

        <div className={`mt-5 flex justify-center`}>
          <Button onClick={handleWithdraw} className="w-full">
            <div className={`flex items-center justify-center`}>
              Borrow {borrowSymbol}
            </div>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default BorrowToken
