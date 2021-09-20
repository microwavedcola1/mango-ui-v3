import { getTokenBySymbol } from '@blockworks-foundation/mango-client'
import { ExclamationCircleIcon } from '@heroicons/react/solid'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import useMangoStore, { WalletToken } from '../stores/useMangoStore'
import { deposit } from '../utils/mango'
import Button from './Button'
import Input from './Input'

const PaybackBorrow = () => {
  // load
  const mangoGroup = useMangoStore((s) => s.selectedMangoGroup.current)
  const mangoGroupConfig = useMangoStore((s) => s.selectedMangoGroup.config)
  const mangoCache = useMangoStore((s) => s.selectedMangoGroup.cache)
  const mangoAccount = useMangoStore((s) => s.selectedMangoAccount.current)
  const walletTokens = useMangoStore((s) => s.wallet.tokens)
  const connection = useMangoStore.getState().connection.current

  // parse symbols from path
  const router = useRouter()
  let borrowSymbol = router.query.borrow as string
  if (borrowSymbol) {
    borrowSymbol = borrowSymbol.toUpperCase()
  }

  const [invalidAmountMessage, setInvalidAmountMessage] = useState('')

  const [borrowAccount, setBorrowAccount] = useState<WalletToken>(null)
  useEffect(() => {
    if (borrowSymbol) {
      const borrowAccount = walletTokens.find(
        (a) => a.config.symbol === borrowSymbol
      )
      if (borrowAccount) {
        setBorrowAccount(borrowAccount)
      } else {
        setBorrowAccount(null)
      }
    }
  }, [borrowSymbol, walletTokens])

  const [maxBorrowPaybackPossible, setMaxBorrowPaybackPossible] =
    useState<number>(null)
  useEffect(() => {
    if (borrowAccount) {
      setMaxBorrowPaybackPossible(borrowAccount.uiBalance)
    }
  }, [borrowAccount])

  const [totalBorrowed, seTotalBorrowed] = useState<number>(null)
  useEffect(() => {
    if (mangoAccount) {
      const borrowToken = getTokenBySymbol(mangoGroupConfig, borrowSymbol)
      const borrowTokenIndex = mangoGroup.getTokenIndex(borrowToken.mintKey)
      const totalBorrowed_ = mangoAccount.getUiBorrow(
        mangoCache.rootBankCache[borrowTokenIndex],
        mangoGroup,
        borrowTokenIndex
      )
      seTotalBorrowed(totalBorrowed_.toNumber())
    }
  }, [borrowSymbol, walletTokens, mangoAccount])

  // form
  const [paybackBorrowInput, setPaybackBorrowInput] = useState<number>()

  const onChangePaybackBorrowInput = () => {
    // todo
  }

  const validateCollateralInput = (paybackBorrowInput) => {
    if (Number(paybackBorrowInput) <= 0) {
      setInvalidAmountMessage('Enter a valid borrow amount to pay back!')
    } else {
      setInvalidAmountMessage(null)
    }
  }

  const setMaxForPayback = () => {
    setPaybackBorrowInput(maxBorrowPaybackPossible)
  }

  const setTotalForPayback = () => {
    setPaybackBorrowInput(totalBorrowed)
  }

  const payback = () => {
    deposit({
      amount: paybackBorrowInput,
      fromTokenAcc: borrowAccount.account,
      mangoAccount,
    }).then(() => {
      mangoAccount.reload(connection)
    })
  }

  return (
    <div className="container grid grid-cols-3">
      <div>
        <div className="flex flex-col sm:flex-row pt-8 pb-3 sm:pb-6 md:pt-10">
          <h1 className={`text-th-fgd-1 text-2xl font-semibold`}>
            Payback {borrowSymbol && borrowSymbol}
          </h1>
        </div>

        <div className="flex justify-between pb-2">
          <div className="text-th-fgd-4">Liquidation price</div>
          <div className="text-th-fgd-1">5</div>
        </div>

        <div className="flex justify-between pb-2 pt-4">
          <div className={`text-th-fgd-1`}>Payback borrowed</div>
          {maxBorrowPaybackPossible < totalBorrowed && (
            <div
              className="text-th-fgd-1 underline cursor-pointer default-transition hover:text-th-primary hover:no-underline"
              onClick={setMaxForPayback}
            >
              Max
            </div>
          )}
          {maxBorrowPaybackPossible > totalBorrowed && (
            <div
              className="text-th-fgd-1 underline cursor-pointer default-transition hover:text-th-primary hover:no-underline"
              onClick={setTotalForPayback}
            >
              Total
            </div>
          )}
        </div>
        <div className="flex">
          <Input
            type="number"
            min="0"
            className={`border border-th-fgd-4 flex-grow pr-11`}
            placeholder={paybackBorrowInput}
            error={!!invalidAmountMessage}
            onBlur={(e) => validateCollateralInput(e.target.value)}
            value={paybackBorrowInput}
            onChange={(e) => onChangePaybackBorrowInput(e.target.value)}
            suffix={borrowSymbol}
          />
        </div>
        {invalidAmountMessage ? (
          <div className="flex items-center pt-1.5 text-th-red">
            <ExclamationCircleIcon className="h-4 w-4 mr-1.5" />
            {invalidAmountMessage}
          </div>
        ) : null}

        <div className={`mt-5 flex justify-center`}>
          <Button onClick={payback} className="w-full">
            <div className={`flex items-center justify-center`}>Payback</div>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PaybackBorrow
