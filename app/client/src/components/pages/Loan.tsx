import React from "react";
import { string, number } from "prop-types";
import { Link } from "react-router-dom";

import { Flex, Box, Heading, Image, Text, PublicAddress } from "rimble-ui";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Badge,
  CardHeader,
  CardTitle,
  CardImg,
  CardFooter,
  Button,
  Progress
} from "shards-react";
import "../../styles/Loan.css";
import SmallStats from "../common/SmallStats";

import dBox from "../../assets/3dbox.svg";
import bloomLogo from "../../assets/bloom-logo.svg";

import { EthereumComponent } from "../EthereumComponent";
import {
  ContributerMetadata,
  LoanMetadata,
  LoanParams,
  TokenMetadata,
  UserMetadata,
  RepaymentData,
  StakerMetadata
} from "../../interfaces";
import { database } from "../../data/database";
import { LoanHeader } from "../loan/LoanHeader";
import { AvatarList, AvatarListData } from "../AvatarList";
import { UserData } from "./UserProfile";
import { LoanFunding } from "../LoanFunding";

var LoanRequest = require("../../contractabi/LoanRequest.json");
var LoanRequestFactory = require("../../contractabi/LoanRequestFactory.json");
var UserStaking = require("../../contractabi/UserStaking.json");

type MyState = {
  web3: any;
  contributors: AvatarListData[];
  loanParams: LoanParams;
  loanMetadata: LoanMetadata;
  userData: UserData;
  tokenMetadata: TokenMetadata;
  isLoaded: boolean;
};

export class Loan extends EthereumComponent {
  state: MyState;

  constructor(props) {
    super(props);
    this.state = {
      contributors: [] as AvatarListData[],
      loanParams: {} as LoanParams,
      loanMetadata: {} as LoanMetadata,
      userData: {} as UserData,
      tokenMetadata: {} as TokenMetadata,
      isLoaded: false,
      web3: null
    };
  }

  // @dev Get icons and names of contributors if they have shared their data, or ethereum blockie and address if not
  async getContributors(): Promise<AvatarListData[]> {
    return [] as AvatarListData[];
  }

  async getStakers(userAddress: string): Promise<string[]> {
    return [] as string[];
  }

  /*
    Get a list of attestations, and the relevant data for each parsed down to what we need. The user gives these to the app via bloom when they create their account, or later. We then store the attestations in our datastore and display them to the potential lenders. Some information may be kept private which the lenders and borrower can communicate directly about
  */
  async getAttestations(userAddress: string): Promise<any> {
    return {};
  }

  // @dev Web3 call to get loan parameters from chain
  async getLoanParameters(): Promise<LoanParams> {
    return {} as LoanParams;
  }

  // @dev Get loan metadata from our servers or possibly IPFS
  async getLoanMetadata(): Promise<LoanMetadata> {
    return {} as LoanMetadata;
  }

  async getTokenMetadata(tokenAddress: string): Promise<TokenMetadata> {
    console.log(database.tokens.get(tokenAddress));
    return database.tokens.get(tokenAddress);
  }

  async getUserMetadata(userId: number): Promise<UserMetadata> {
    return database.users.get(userId);
  }

  async componentDidMount() {
    //Dummy Data
    this.setState({
      contributors: [
        {
          img: "https://airswap-token-images.s3.amazonaws.com/DAI.png",
          text: "Dai"
        },
        {
          img: "https://airswap-token-images.s3.amazonaws.com/DAI.png",
          text: "USDC"
        }
      ],
      loanParams: {
        principal: 60000,
        fundsRaised: 48000,
        interestRate: 6,
        tenor: 120,
        gracePeriod: 24,
        repayments: 100,
        repaymentSchedule: [],
        loanCurrency: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
      },
      loanMetadata: {
        location: "Jakarta, Indonesia",
        purpose: "University",
        description:
          "Student loan for Masters Degree in Human Resources at Cornell University, with the intention to work in the US HR sector post-graduation.",
        userStory:
          "Student loan for Masters Degree in Human Resources at Cornell University, with the intention to work in the US HR sector post-graduation.",
        imgSrc: ""
      },
      userData: {
        name: "Ines"
      },
      isLoaded: true
    });

    //Contract Instances
    if (!this.state.web3) {
      //Connect ot infura - at the previous component
    }

    // var MyContract = contract({
    //   abi: ...,
    //   unlinked_binary: ...,
    //   address: ..., // optional
    //   // many more
    // })

    //Will get real data
    const contributors = await this.getContributors();
    const loanParams = await this.getLoanParameters();
    const tokenMetadata = await this.getTokenMetadata(
      this.state.loanParams.loanCurrency
    );

    this.setState({
      tokenMetadata: tokenMetadata
    });
  }

  get getLoan() {
    return {
      category: "Education",
      metadata: Object.assign({}, this.state.loanMetadata, {
        imgSrc:
          "https://cdn.pixabay.com/photo/2017/02/17/23/15/duiker-island-2076042_960_720.jpg"
      }),
      borrower: {
        address: "0x0",
        metadata: this.state.userData
      },
      articles: [{ name: "Medium Post", url: "weee" }],
      documents: [{ name: "Cornell Admission Letter", url: "weee" }]
    };
  }

  render() {
    const {
      contributors,
      loanParams,
      loanMetadata,
      userData,
      isLoaded,
      tokenMetadata
    } = this.state;
    const percentFunded = (loanParams.fundsRaised / loanParams.principal) * 100;

    return (
      <Container className="main-content-container py-4 px-4">
        <Row className="py-4">
          <Col lg="4" md="12" sm="12" className="py-2">
            <Card small className="card-post">
              <div
                className="card-post__image"
                // style={{ backgroundImage: `url('${post.backgroundImage}')` }}
                // style={{ backgroundImage: `url('${post.backgroundImage}')` }}
              />
            </Card>
          </Col>
          <Col lg="8" md="12" sm="12" className="py-2">
            <Card className="card-post h-100 text-left">
              <CardBody>
                <h5>
                  <strong>Loan Purpose</strong>
                </h5>
                <p>
                  Student loan for Masters Degree in Human Resources at Cornell
                  University, with the intent to work in the US Human Resources
                  sector post-graduation.
                </p>
              </CardBody>
            </Card>
          </Col>
        </Row>
        <Row>
          <Col lg="6" className="py-2">
            <Card small className="card-post">
              <div
                className="card-post__image"
                // style={{ backgroundImage: `url('${post.backgroundImage}')` }}
                // style={{ backgroundImage: `url('${post.backgroundImage}')` }}
              />
            </Card>
          </Col>
          <Col lg="6" className="py-2">
            <Card small className="card-post">
              <div
                className="card-post__image"
                // style={{ backgroundImage: `url('${post.backgroundImage}')` }}
                // style={{ backgroundImage: `url('${post.backgroundImage}')` }}
              />
            </Card>
          </Col>
        </Row>
        <Row className="justify-content-center pt-4 pb-2">
          <h4>
            <strong>Loan Terms</strong>
          </h4>
        </Row>
        <Row>
          <Col md="6" sm="6" className="col-lg mb-4">
            <SmallStats
              variation="1"
              label="principal"
              value="60,000"
              subheader="USDC"
              increase="11293"
            />
          </Col>
          <Col md="6" sm="6" className="col-lg mb-4">
            <SmallStats
              variation="1"
              label="interest"
              value="6%"
              subheader="EFFECTIVE ANNUAL"
              increase="11293"
            />
          </Col>
          <Col md="6" sm="6" className="col-lg mb-4">
            <SmallStats
              variation="1"
              label="tenor"
              value="12"
              subheader="YEARS"
              increase="11293"
            />
          </Col>
          <Col md="6" sm="6" className="col-lg mb-4">
            <SmallStats
              variation="1"
              label="grace period"
              value="2"
              subheader="YEARS"
              increase="11293"
            />
          </Col>
          <Col md="6" sm="6" className="col-lg mb-4" s>
            <SmallStats
              variation="1"
              label="expected return"
              value="36%"
              subheader="PER ANNUM"
              increase="11293"
            />
          </Col>
        </Row>
        <Row className="mt-4">
          <Col lg="6" className="py-2">
            <Card className="card-post h-100 text-left">
              <CardBody>
                <h5>
                  <strong>Funding</strong>
                </h5>
                <p>asdfasdf</p>
              </CardBody>
            </Card>
          </Col>
          <Col lg="6" className="py-2">
            <Card className="card-post h-100 text-left">
              <CardBody>
                <h5>
                  <strong>Progress</strong>
                </h5>
                <p>asdfasdfasdf</p>
              </CardBody>
            </Card>
          </Col>
        </Row>
        <Row className="py-4">
          <Col>
            <Card small className="mb-4">
              <CardHeader className="border-bottom text-left">
                <h6 className="m-0">Repayment Schedule</h6>
              </CardHeader>
              <CardBody className="p-0 pb-3">
                <table className="table mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th scope="col" className="border-0">
                        #
                      </th>
                      <th scope="col" className="border-0">
                        First Name
                      </th>
                      <th scope="col" className="border-0">
                        Last Name
                      </th>
                      <th scope="col" className="border-0">
                        Country
                      </th>
                      <th scope="col" className="border-0">
                        City
                      </th>
                      <th scope="col" className="border-0">
                        Phone
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td>Ali</td>
                      <td>Kerry</td>
                      <td>Russian Federation</td>
                      <td>Gdańsk</td>
                      <td>107-0339</td>
                    </tr>
                    <tr>
                      <td>2</td>
                      <td>Clark</td>
                      <td>Angela</td>
                      <td>Estonia</td>
                      <td>Borghetto di Vara</td>
                      <td>1-660-850-1647</td>
                    </tr>
                    <tr>
                      <td>3</td>
                      <td>Jerry</td>
                      <td>Nathan</td>
                      <td>Cyprus</td>
                      <td>Braunau am Inn</td>
                      <td>214-4225</td>
                    </tr>
                    <tr>
                      <td>4</td>
                      <td>Colt</td>
                      <td>Angela</td>
                      <td>Liberia</td>
                      <td>Bad Hersfeld</td>
                      <td>1-848-473-7416</td>
                    </tr>
                  </tbody>
                </table>
              </CardBody>
            </Card>
            s
          </Col>
        </Row>
      </Container>
      // <div className="tight-page" style={{ marginTop: "48px" }}>
      //   <LoanHeader
      //     loan={this.getLoan}
      //   />

      //   <Flex className="section-row" >
      //     <Box p={3} width={1 / 2} color="black" bg="white">
      //       <Card>
      //         <CardBody>
      //           <Flex >
      //             <Box width={2 / 4}>
      //               <Heading.h2 className="SF-Pro-Display-Semibold" textAlign="left">Identity</Heading.h2>
      //             </Box>
      //             <Box width={2 / 4}>
      //               <div style={{ position: "relative", marginTop: "-20px", marginRight: "-5px", width: "100%" }}>
      //                 <Text textAlign="right" className="SF-Pro-Display-Light gray">Powered by</Text>
      //                 <div className="powered-by">
      //                   <a href="https://https://3box.io/" target="_blank"><Image src={dBox} /></a>
      //                   <a href="https://bloom.co/" target="_blank"><Image src={bloomLogo} /></a>
      //                 </div>
      //               </div>
      //             </Box>
      //           </Flex>
      //           <div>
      //             <PublicAddress
      //               className="pubAddress"
      //               address={this.getLoan.borrower.address}
      //               label=""
      //             />
      //           </div>
      //         </CardBody>
      //       </Card>
      //     </Box>
      //     <Box p={3} width={1 / 2} color="black" bg="white">

      //       <Card>
      //         <CardBody>
      //           <h2>{percentFunded}% Funded</h2>
      //           <Progress theme="primary" value={percentFunded} />
      //           <Text>Total Amount ${loanParams.principal}</Text>
      //           <Text>Powered by {contributors.length} lenders</Text>

      //         </CardBody>
      //       </Card>
      //     </Box>
      //   </Flex>

      //   <Flex>
      //     <Box p={3} width={1 / 2} color="black" bg="white">
      //       <Card>
      //         <CardBody>
      //           <h3>{userData.name}'s Story</h3>
      //           <p>{loanMetadata.userStory}</p>
      //         </CardBody>
      //       </Card>
      //     </Box>
      //     <Box p={3} width={1 / 2} color="black" bg="white">

      //       <Card>
      //         <CardBody>
      //           <h3>Loan Details</h3>
      //           <Text>Principal: ${loanParams.principal} {tokenMetadata.name}</Text>
      //           <Text>Interest: {loanParams.interestRate}% Effective Annual</Text>
      //           <Text>Tenor: {loanParams.tenor / 12} Years</Text>
      //           <Text>Grace Period: {loanParams.gracePeriod / 12} Years</Text>
      //           <Text>Expected Return: {36}%</Text>
      //         </CardBody>
      //       </Card>

      //       <LoanFunding></LoanFunding>
      //       {/* 6<h3>Repayment Schedule</h3> */}
      //     </Box>
      //   </Flex>

      //   <Flex>
      //     <Box p={3} width={1 / 2} color="black" bg="white">
      //       <Card>
      //         <CardBody>
      //           <h3>Contributors</h3>
      //           <AvatarList data={contributors}></AvatarList>
      //         </CardBody>
      //       </Card>
      //     </Box>
      //   </Flex>
      // </div>
    );
  }
}
