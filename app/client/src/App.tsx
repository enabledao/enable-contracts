import React from "react";
import { RequestElement, Action } from "@bloomprotocol/share-kit-react";
import { DismissibleAlert } from "./components/DismissableAlert";
import { LandingPage } from "./components/pages/LandingPage";
import { Home } from "./components/pages/Home";
import { UserProfile } from "./components/pages/UserProfile";
import { Loan } from "./components/pages/Loan";
import { BrowserRouter as Router, Route } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import "shards-ui/dist/css/shards.min.css"

import * as api from "./api";
import { socketOn, socketOff, initSocketConnection } from "./socket";
import web3Init from './utils/web3Init';

import "./App.css";

type AppState = {
  status: "loading" | "ready" | "scanned";
  token: string;
  email?: string;
  web3: any;
}


class App extends React.Component<{}, AppState> {
  readonly state: AppState = { status: "loading", token: "", web3: undefined };

  private handleQRScan = (payload: { email: string }) => {
    this.setState(() => ({ status: "scanned", email: payload.email }));
  };

  private renderLoading = () => <div>Loading...</div>;

  private renderReady = () => {
    // When this is not set fall back to the current url.
    // Good for when the app is deployed and the server URL is the same as the client.
    const url = `${process.env.REACT_APP_SERVER_URL ||
      `${window.location.protocol}//${window.location.host}`}/scan`;
    const buttonCallbackUrl = `${window.location.protocol}//${
      window.location.host
      }?token=${this.state.token}`;

    return (
      <div>
        <React.Fragment>
          <p className="app__description">Please scan the QR code to continue</p>
          <RequestElement
            {...{ className: "app__request-element-container" }}
            requestData={{
              action: Action.attestation,
              token: this.state.token,
              url: url,
              org_logo_url: "https://bloom.co/favicon.png",
              org_name: "Bloom Starter",
              org_usage_policy_url: "https://bloom.co/legal/terms",
              org_privacy_policy_url: "https://bloom.co/legal/privacy",
              types: ["email"]
            }}
            buttonCallbackUrl={buttonCallbackUrl}
            qrOptions={{ size: 300 }}
          />
        </React.Fragment>
      </div>
    );
  };

  private renderScanned = () => (
    <React.Fragment>
      <DismissibleAlert message="You can easily dismiss me using the <strong>close</strong> button &rarr;"></DismissibleAlert>
      <p className="app__description">
        Thank you for sharing! You told us your email is {this.state.email}
      </p>
    </React.Fragment>
  );

  private acquireSession = () => {
    api
      .session()
      .then(result => {
        console.log("api.session() result", result);
        initSocketConnection();
        socketOn("share-kit-scan", this.handleQRScan);
        this.setState(() => ({ status: "ready", token: result.token }));
      })
      .catch(() => {
        console.warn("Something went wrong while starting a session");
      });
  };

  private  async loadWeb3 () {
    const web3 = await web3Init ;
    this.setState ({
      web3
    });
  }

  componentWillMount() {
    // metaMask listener
    window.addEventListener('load', async () => {
      await this.loadWeb3();
    });
  }

  componentDidMount() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    if (token) {
      api
        .getReceivedData(token)
        .then(result => {
          console.log("api.getReceivedData() result", result);
          this.setState(() => ({
            status: "scanned",
            email: result.receivedData.email
          }));
        })
        .catch(() => this.acquireSession());
      return;
    }

    this.acquireSession();
  }

  componentWillUnmount() {
    socketOff("share-kit-scan", this.handleQRScan);
  }

  render() {
    return (
      <div className="app">
        <Router>
          <Route exact={true} path="/" component={LandingPage} />
          <Route exact={true} path="/home" component={Home} />
          <Route exact={true} path="/getting-started" render={props => <div>#getting-started</div>} />
          <Route exact={true} path="/profile/:address" component={UserProfile} />
          <Route exact={true} path="/loan/:address" component={Loan} />
        </Router>
        {this.state.status === "loading" && this.renderLoading()}
        {this.state.status === "ready" && this.renderReady()}
        {this.state.status === "scanned" && this.renderScanned()}
      </div>
    );
  }
}

export default App;
