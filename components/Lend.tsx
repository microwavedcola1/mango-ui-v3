import { ExclamationCircleIcon } from '@heroicons/react/solid'
import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import useMangoStore, { WalletToken } from '../stores/useMangoStore'
import { deposit } from '../utils/mango'
import Button from './Button'
import Input from './Input'

const Lend = () => {
  // load
  const mangoAccount = useMangoStore((s) => s.selectedMangoAccount.current)
  const walletTokens = useMangoStore((s) => s.wallet.tokens)
  const connection = useMangoStore.getState().connection.current

  // parse symbols from path
  const router = useRouter()
  let lendSymbol = router.query.collateral as string
  if (lendSymbol) {
    lendSymbol = lendSymbol.toUpperCase()
  }

  const [invalidAmountMessage, setInvalidAmountMessage] = useState('')

  const [lendAccount, setLendAccount] = useState<WalletToken>(null)
  useEffect(() => {
    if (lendSymbol) {
      const lendAccount = walletTokens.find(
        (a) => a.config.symbol === lendSymbol
      )
      if (lendAccount) {
        setLendAccount(lendAccount)
      } else {
        setLendAccount(null)
      }
    }
  }, [lendSymbol, walletTokens])

  const [maxLendPossible, setMaxLendPossible] = useState<number>(null)
  useEffect(() => {
    if (lendAccount) {
      setMaxLendPossible(lendAccount.uiBalance)
    }
  }, [lendAccount])

  // form
  const [lendInput, setLendInput] = useState<number>()

  const onChangeLendInput = (lendInput) => {
    setLendInput(lendInput)
  }

  const validateLendInput = (lendInput) => {
    if (Number(lendInput) <= 0) {
      setInvalidAmountMessage('Enter a valid lend amount to pay back!')
    } else {
      setInvalidAmountMessage(null)
    }
  }

  const setMaxForLend = () => {
    setLendInput(maxLendPossible)
  }

  const lend = () => {
    console.log(mangoAccount)
    deposit({
      amount: lendInput,
      fromTokenAcc: lendAccount.account,
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
            Lend {lendSymbol && lendSymbol}
          </h1>
        </div>

        <div className="flex justify-between pb-2">
          <div className="text-th-fgd-4">APR</div>
          <div className="text-th-fgd-1">2.5</div>
        </div>

        <div className="flex justify-between pb-2 pt-4">
          <div className={`text-th-fgd-1`}>Lend</div>
          <div
            className="text-th-fgd-1 underline cursor-pointer default-transition hover:text-th-primary hover:no-underline"
            onClick={setMaxForLend}
          >
            Max
          </div>
        </div>
        <div className="flex">
          <Input
            type="number"
            min="0"
            className={`border border-th-fgd-4 flex-grow pr-11`}
            placeholder={lendInput}
            error={!!invalidAmountMessage}
            onBlur={(e) => validateLendInput(e.target.value)}
            value={lendInput}
            onChange={(e) => onChangeLendInput(e.target.value)}
            suffix={lendSymbol}
          />
        </div>
        {invalidAmountMessage ? (
          <div className="flex items-center pt-1.5 text-th-red">
            <ExclamationCircleIcon className="h-4 w-4 mr-1.5" />
            {invalidAmountMessage}
          </div>
        ) : null}

        <div className={`mt-5 flex justify-center`}>
          <Button onClick={lend} className="w-full">
            <div className={`flex items-center justify-center`}>Lend</div>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Lend
