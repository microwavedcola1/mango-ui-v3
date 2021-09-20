import React from 'react'
import BorrowToken from '../../../components/BorrowToken'
import Lend from '../../../components/Lend'
import PageBodyContainer from '../../../components/PageBodyContainer'
import PaybackBorrow from '../../../components/PaybackBorrow'
import TopBar from '../../../components/TopBar'

const Borrow = () => {
  return (
    <div>
      <TopBar />
      <div>
        <PageBodyContainer>
          <Lend />
          <PaybackBorrow />
          <BorrowToken />
        </PageBodyContainer>
      </div>
    </div>
  )
}

export default Borrow
