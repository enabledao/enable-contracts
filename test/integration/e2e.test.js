// TODO(Dan): Create end-to-end integration test

/* 
    Setup
*/

// Deploy a factory instance & a dummy payment token

/* 
    Execution
*/

/*
    1. Borrower creates Loan via Crowdloan factory deploy()
    2. Lenders send funds 
        - Check that they get the right shares
        - Check that the loan is in the correct status before it's fully funded
    3. Borrower withdraws when enough funds are sent
        - Check that the loan is in the correct status after it's fully funded
    4. Borrower repays via RepaymentManager pay()
        - Make sure the right events are fired
    5. Some lenders try to withdraw single payment
        - On some we should wait and have them try to withdraw from multiple payments at once
    6. More repayments happen
    7. Some lenders try to withdraw after multiple payments
    

I'd also want to make sure the loan values are correct for each payment with a simple loan calcuation.
*/
