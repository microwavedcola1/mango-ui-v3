import {
  makeDepositInstruction,
  makeWithdrawInstruction,
  MangoAccount,
  MangoClient,
  TokenAccount,
  uiToNative,
} from '@blockworks-foundation/mango-client'
import {
  closeAccount,
  initializeAccount,
  WRAPPED_SOL_MINT,
} from '@project-serum/serum/lib/token-instructions'
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token } from '@solana/spl-token'
import {
  Account,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'
import useMangoStore, { programId } from '../stores/useMangoStore'
import { TOKEN_PROGRAM_ID } from './tokens'
export async function deposit({
  amount,
  fromTokenAcc,
  mangoAccount,
  accountName,
}: {
  amount: number
  fromTokenAcc: TokenAccount
  mangoAccount?: MangoAccount
  accountName?: string
}) {
  const mangoGroup = useMangoStore.getState().selectedMangoGroup.current
  const wallet = useMangoStore.getState().wallet.current
  const tokenIndex = mangoGroup.getTokenIndex(fromTokenAcc.mint)
  const mangoClient = useMangoStore.getState().connection.client

  if (mangoAccount) {
    return await mangoClient.deposit(
      mangoGroup,
      mangoAccount,
      wallet,
      mangoGroup.tokens[tokenIndex].rootBank,
      mangoGroup.rootBankAccounts[tokenIndex].nodeBankAccounts[0].publicKey,
      mangoGroup.rootBankAccounts[tokenIndex].nodeBankAccounts[0].vault,
      fromTokenAcc.publicKey,
      Number(amount)
    )
  } else {
    return await mangoClient.initMangoAccountAndDeposit(
      mangoGroup,
      wallet,
      mangoGroup.tokens[tokenIndex].rootBank,
      mangoGroup.rootBankAccounts[tokenIndex].nodeBankAccounts[0].publicKey,
      mangoGroup.rootBankAccounts[tokenIndex].nodeBankAccounts[0].vault,
      fromTokenAcc.publicKey,
      Number(amount),
      accountName
    )
  }
}

export async function withdraw({
  amount,
  token,
  allowBorrow,
}: {
  amount: number
  token: PublicKey
  allowBorrow: boolean
}) {
  const mangoAccount = useMangoStore.getState().selectedMangoAccount.current
  const mangoGroup = useMangoStore.getState().selectedMangoGroup.current
  const wallet = useMangoStore.getState().wallet.current
  const tokenIndex = mangoGroup.getTokenIndex(token)
  const mangoClient = useMangoStore.getState().connection.client

  return await mangoClient.withdraw(
    mangoGroup,
    mangoAccount,
    wallet,
    mangoGroup.tokens[tokenIndex].rootBank,
    mangoGroup.rootBankAccounts[tokenIndex].nodeBankAccounts[0].publicKey,
    mangoGroup.rootBankAccounts[tokenIndex].nodeBankAccounts[0].vault,
    Number(amount),
    allowBorrow
  )
}

export async function depositAndWithdraw(
  mangoAccount: MangoAccount,
  collateralSymbol: string,
  collateralAmount: number,
  fromTokenAcc: TokenAccount,
  borrowSymbol: string,
  borrowAmount: number,
  borrowTokenMint: PublicKey,
  allowBorrow: boolean
) {
  const connection = useMangoStore.getState().connection.current
  const mangoGroup = useMangoStore.getState().selectedMangoGroup.current
  const owner = useMangoStore.getState().wallet.current
  const mangoClient = new MangoClient(connection, programId)

  // let accountInstruction
  // let accInstr
  // {
  //   const transaction = new Transaction()
  //   let additionalSigners = []

  //   // InitMangoAccount
  //   {
  //     accountInstruction = await createAccountInstruction(
  //       connection,
  //       owner.publicKey,
  //       MangoAccountLayout.span,
  //       programId
  //     )
  //     const initMangoAccountInstruction = makeInitMangoAccountInstruction(
  //       programId,
  //       mangoGroup.publicKey,
  //       accountInstruction.account.publicKey,
  //       owner.publicKey
  //     )
  //     transaction.add(accountInstruction.instruction)
  //     transaction.add(initMangoAccountInstruction)
  //     additionalSigners.push(accountInstruction.account)
  //   }

  //   // name
  //   {
  //     const info = `${collateralSymbol}:${Number(collateralAmount).toFixed(
  //       1
  //     )}-${borrowSymbol}-:${Number(borrowAmount).toFixed(1)}`
  //     const encoded = Buffer.from(info)
  //     console.log(info)
  //     console.log(encoded.length)
  //     const instruction = makeAddMangoAccountInfoInstruction(
  //       programId,
  //       mangoGroup.publicKey,
  //       accountInstruction.account.publicKey,
  //       owner.publicKey,
  //       info
  //     )
  //     transaction.add(instruction)
  //   }

  //   // SpotOpenOrdersInstruction
  //   {
  //     const openOrdersSpace = OpenOrders.getLayout(mangoGroup.dexProgramId).span
  //     const openOrdersLamports =
  //       await connection.getMinimumBalanceForRentExemption(
  //         openOrdersSpace,
  //         'processed'
  //       )
  //     accInstr = await createAccountInstruction(
  //       connection,
  //       owner.publicKey,
  //       openOrdersSpace,
  //       mangoGroup.dexProgramId,
  //       openOrdersLamports
  //     )
  //     const spotMarketConfig = mangoGroupConfig.spotMarkets.filter(
  //       (spotMarketConfig) => spotMarketConfig.baseSymbol === collateralSymbol
  //     )[0]
  //     const initOpenOrders = makeInitSpotOpenOrdersInstruction(
  //       programId,
  //       mangoGroup.publicKey,
  //       accountInstruction.account.publicKey,
  //       owner.publicKey,
  //       mangoGroup.dexProgramId,
  //       accInstr.account.publicKey,
  //       spotMarketConfig.publicKey,
  //       mangoGroup.signerKey
  //     )
  //     transaction.add(accInstr.instruction)
  //     transaction.add(initOpenOrders)
  //     additionalSigners.push(accInstr.account)
  //   }
  //   await mangoClient.sendTransaction(transaction, owner, additionalSigners)
  // }

  // collateral
  {
    const transaction = new Transaction()
    const additionalSigners = []

    {
      const collateralTokenIndex = mangoGroup.getTokenIndex(fromTokenAcc.mint)
      const collateralRootBank =
        mangoGroup.tokens[collateralTokenIndex].rootBank
      const collateralNodeBank =
        mangoGroup.rootBankAccounts[collateralTokenIndex].nodeBankAccounts[0]
          .publicKey
      const vault =
        mangoGroup.rootBankAccounts[collateralTokenIndex].nodeBankAccounts[0]
          .vault
      const collateralTokenMint = mangoGroup.tokens[collateralTokenIndex].mint
      let collateralWrappedSolAccount: Account | null = null
      if (
        collateralTokenMint.equals(WRAPPED_SOL_MINT) &&
        fromTokenAcc.publicKey.toBase58() === owner.publicKey.toBase58()
      ) {
        collateralWrappedSolAccount = new Account()
        const lamports = Math.round(collateralAmount * LAMPORTS_PER_SOL) + 1e7
        transaction.add(
          SystemProgram.createAccount({
            fromPubkey: owner.publicKey,
            newAccountPubkey: collateralWrappedSolAccount.publicKey,
            lamports,
            space: 165,
            programId: TOKEN_PROGRAM_ID,
          })
        )
        transaction.add(
          initializeAccount({
            account: collateralWrappedSolAccount.publicKey,
            mint: WRAPPED_SOL_MINT,
            owner: owner.publicKey,
          })
        )
        additionalSigners.push(collateralWrappedSolAccount)
      }
      const collateralNativeQuantity = uiToNative(
        collateralAmount,
        mangoGroup.tokens[collateralTokenIndex].decimals
      )
      transaction.add(
        makeDepositInstruction(
          programId,
          mangoGroup.publicKey,
          owner.publicKey,
          mangoGroup.mangoCache,
          mangoAccount.publicKey,
          collateralRootBank,
          collateralNodeBank,
          vault,
          collateralWrappedSolAccount?.publicKey ?? fromTokenAcc.publicKey,
          collateralNativeQuantity
        )
      )
      if (collateralWrappedSolAccount) {
        transaction.add(
          closeAccount({
            source: collateralWrappedSolAccount.publicKey,
            destination: owner.publicKey,
            owner: owner.publicKey,
          })
        )
      }
    }

    // withdraw
    {
      const withdrawTokenIndex = mangoGroup.getTokenIndex(borrowTokenMint)
      const withdrawRootBank = mangoGroup.tokens[withdrawTokenIndex].rootBank
      const withdrawNodeBank =
        mangoGroup.rootBankAccounts[withdrawTokenIndex].nodeBankAccounts[0]
          .publicKey
      const withdrawVault =
        mangoGroup.rootBankAccounts[withdrawTokenIndex].nodeBankAccounts[0]
          .vault
      const withdrawTokenMint = mangoGroup.tokens[withdrawTokenIndex].mint
      let tokenAcc = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        withdrawTokenMint,
        owner.publicKey
      )
      let withdrawWrappedSolAccount: Account | null = null
      if (withdrawTokenMint.equals(WRAPPED_SOL_MINT)) {
        withdrawWrappedSolAccount = new Account()
        tokenAcc = withdrawWrappedSolAccount.publicKey
        const space = 165
        const lamports = await connection.getMinimumBalanceForRentExemption(
          space,
          'processed'
        )
        transaction.add(
          SystemProgram.createAccount({
            fromPubkey: owner.publicKey,
            newAccountPubkey: tokenAcc,
            lamports,
            space,
            programId: TOKEN_PROGRAM_ID,
          })
        )
        transaction.add(
          initializeAccount({
            account: tokenAcc,
            mint: WRAPPED_SOL_MINT,
            owner: owner.publicKey,
          })
        )
        additionalSigners.push(withdrawWrappedSolAccount)
      } else {
        const tokenAccExists = await connection.getAccountInfo(
          tokenAcc,
          'recent'
        )
        if (!tokenAccExists) {
          transaction.add(
            Token.createAssociatedTokenAccountInstruction(
              ASSOCIATED_TOKEN_PROGRAM_ID,
              TOKEN_PROGRAM_ID,
              withdrawTokenMint,
              tokenAcc,
              owner.publicKey,
              owner.publicKey
            )
          )
        }
      }
      const withdrawNativeQuantity = uiToNative(
        borrowAmount,
        mangoGroup.tokens[withdrawTokenIndex].decimals
      )
      transaction.add(
        makeWithdrawInstruction(
          programId,
          mangoGroup.publicKey,
          mangoAccount.publicKey,
          owner.publicKey,
          mangoGroup.mangoCache,
          withdrawRootBank,
          withdrawNodeBank,
          withdrawVault,
          tokenAcc,
          mangoGroup.signerKey,
          mangoAccount.spotOpenOrders,
          withdrawNativeQuantity,
          allowBorrow
        )
      )
      if (withdrawWrappedSolAccount) {
        transaction.add(
          closeAccount({
            source: withdrawWrappedSolAccount.publicKey,
            destination: owner.publicKey,
            owner: owner.publicKey,
          })
        )
      }
    }

    await mangoClient.sendTransaction(transaction, owner, additionalSigners)
  }
}
