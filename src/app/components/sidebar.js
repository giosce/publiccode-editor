import React, { Component } from "react";
import { connect } from "react-redux";
import copy from "copy-to-clipboard";
import validator from "validator";
import { notify } from "../store/notifications";
import { APP_FORM, sampleGhUrl, sampleUrl } from "../contents/constants";
import img_x from "../../asset/img/x.svg";
import img_copy from "../../asset/img/copy.svg";
import img_upload from "../../asset/img/load.svg";
import img_download from "../../asset/img/download.svg";
import img_dots from "../../asset/img/dots.svg";
import img_xx from "../../asset/img/xx.svg";
import img_gh_pr from "../../asset/img/gh_pr.svg";

import { passRemoteURLToValidator } from "../utils/calls";
import { getLabel } from "../contents/data";

import Gh from '../utils/GithubClient'
import {
  setStateToken,
  setAuthToken,
  exchangeCodeForToken
} from '../store/authenticate'
import { setAuthorize, fetchUserPermission } from '../store/authorize'
import { startFetch, endFetch } from '../store/repo';
import { unsetAndUnstoreRepo } from '../store/authorize';


function mapStateToProps(state) {
  console.log(state)
  return { 
    form: state.form,
  };
}

const mapDispatchToProps = dispatch => {
  return {
    notify: data => dispatch(notify(data)),
    setAuthToken: token => dispatch(setAuthToken(token)),
    exchangeCodeForToken: (stateToken, code) => dispatch(exchangeCodeForToken(stateToken, code)),
    setStateToken: stateToken => dispatch(setStateToken(stateToken)),
    setAuthorize: bool => dispatch(setAuthorize(bool)),
    fetchUserPermission: (token, owner, repo) => dispatch(fetchUserPermission(token, owner, repo)),
    unsetRepo: () => dispatch(unsetAndUnstoreRepo()),
    startRepoFetch: () => dispatch(startFetch()),
    finishRepoFetch: () => dispatch(endFetch())
  };
};


@connect(
  mapStateToProps,
  mapDispatchToProps
)
class sidebar extends Component {
  constructor(props) {
    super(props);
    console.log("Sidebar")
    console.log(props)
    this.state = {
      dialog: false,
      remoteYml: sampleUrl,
      targetRepo: sampleGhUrl,
      ghdialog: false
    };
    console.log(this.state)
    console.log(this.prop)
  }

  async componentDidMount() {
    console.log("******* componentDidMount ********")
    this.handleAuthState(this.checkAuthState())
  }

  componentDidUpdate(prevProps) {
    console.log("******* componentDidUpdate ********")
    let { verdict, payload } = this.checkAuthState()
    if (!(verdict === 'authenticated' && this.props.authorized)
    || this.props.targetRepo !== prevProps.targetRepo) {
        this.handleAuthState({ verdict, payload })
    }
  }

  checkAuthState() {
    let access_token = window.sessionStorage.getItem('GH_ACCESS_TOKEN')
    let target_repo = window.sessionStorage.getItem('target_repo')

    console.log("token", access_token)
    console.log("repo", target_repo)

    // first case can only occur on cmpntDidUpdate()
    // if auth token found in store.state and stored on browser, 'authenticated'
    if (this.props.authenticated === true && access_token) {
        return { verdict: 'authenticated' }
    } else if (access_token && target_repo) {
        // this case should only occur on returning to page within same browser sesh
        // user has token already, and repo should only be stored if user has permission on it
        return {
            verdict: 'previously_authorized',
            payload: [ // return iterable payload so I can spread it as function args
                access_token,
                target_repo // re-check permissions below
            ]
        }
    } else if (access_token) {
        // this case should only occure on returning to page within same browser sesh
        // user has token already, but needs to connect a repo
        return {
            verdict: 'previously_authenticated',
            payload: access_token
        }
    }

    // if no ghAuthToken found anywhere, check for gh state token & code
    let { code, stateToken } = this.getCodeAndStateFromQs(window.location.search)
    let storedStateToken = window.sessionStorage.getItem('GH_STATE_TOKEN')
    if (code && stateToken && storedStateToken && stateToken === storedStateToken) return {
        verdict: 'pending',
        payload: code
    }

    return {
        verdict: 'not_authenticated'
    }
  }

  /**
  * 1. check for GH auth token on sessionStorage and Redux store
  *    - if present, user is authorized
  * 2. if no GH auth token, check for [ GH state token, code ] in `qs` & [ GH state token ] in `sessionStorage`
  *    - if found, user is mid-auth-flow, exchange GH code for auth token
  * 3. if no [ GH state token | code ] on `qs` or no [ GH state token ] in `sessionStorage`, user has yet to authorize
  *    - generate Gh state token, hold it in state & save it in sessionStorage
  */
  async handleAuthState({ verdict, payload }) {
    // TODO: handle permutations and combinations of `authorized` w/ `authenticated`
    console.log("handleAuthState")
    console.log(verdict)
    console.log(payload)

    if (verdict === 'authenticated') return
    else if (verdict === 'previously_authorized') {
        // previously authorized, try to authorize again
        this.props.setAuthToken(payload[0])
        this.props.fetchUserPermission(...payload)
    } else if (verdict === 'previously_authenticated') {
        // previously auathenticated, no need to authorize again
        // we need to collect a new repo from user
        this.props.setAuthToken(payload)
    } else if (verdict === 'pending') {
        window.history.replaceState('publiccode-pusher login', '', '/')
        window.sessionStorage.removeItem('GH_STATE_TOKEN')
        this.props.exchangeCodeForToken(payload)
    } else {
        console.log("getting ghStateToken")
        const ghStateToken = Gh.generateState()
        console.log(ghStateToken)
        window.sessionStorage.setItem('GH_STATE_TOKEN', ghStateToken)
        this.props.setStateToken(ghStateToken)
        this.state.ghStateToken = ghStateToken
    }
    console.log(this.props)
    // what the hell is the difference between auth and state token?!
    console.log(this.props.ghStateToken)
  }

  getCodeAndStateFromQs(qs) {
    console.log("getCodeAndStateFromQs", qs)
    qs = qs.slice(1)
    if (!qs) return false
    let params = qs.split('&')

    let code = params.find(param => param.startsWith('code='))
    code = code && decodeURI(code.split('=')[1])

    let stateToken = params.find(param => param.startsWith('state='))
    stateToken = stateToken && decodeURI(stateToken.split('=')[1])

    return { code, stateToken }
  }

  async pushToGithub(data) {
    console.log("pushToGithub")
    console.log("props", this.props)
    console.log("state", this.state)
    console.log("props.token", this.props.token)
    console.log("state.token", this.state.ghStateToken)
    // let gh = new Gh(this.props.token)
    let gh = new Gh(this.state.ghStateToken)
    let [ owner, repo ] = this.state.targetRepo.replace(/https*:\/\/github.com\//, '').split('/')
    console.log("before startRepoFetch", owner, repo)
    this.props.startRepoFetch()
    console.log("after startRepoFetch")

    try {
      let { object: { sha: baseSha }} = await gh.repo.branch.get(owner, repo, 'master')
      await gh.repo.branch.push(owner, repo, baseSha)

      // This stuff is all copy+pasted from this.generate() & this.showResults()
      // TODO: I don't need to access state if I can use the formData that is passed as argument
      // let { values, country, elements } = this.state;
      // let obj = ft.transform(values, country, elements);

      // let mergedValue = { ...staticFieldsJson, ...obj };
      // let tmpYaml = jsyaml.dump(mergedValue);
      let yaml = data; //staticFieldsYaml + tmpYaml;

      // commit YAML file to the branch Publiccode-pusher/add-publiccode-yml
      await gh.repo.commit(owner, repo, btoa(yaml))

      // Open a pull request for branch Publiccode-pusher/add-publiccode-yml
      let pr = await gh.repo.pulls.open(owner, repo)
      this.setState({ pullRequestURL: pr.url })
      this.submitFeedback()

      this.setState({ yaml, loading: false });
    } catch (er) {
      console.error(er);
      this.props.notify({
        type: 'error',
        title: 'Oops',
        msg: er.message,
        millis: 30000
      })
    } finally {
      this.props.finishRepoFetch()
    }
  }


  componentWillReceiveProps(prevProps) {
    const { remoteYml } = prevProps;
    const funFake = ({
      preventDefault: () => { }
    })

    if (remoteYml !== this.props.remoteYml) {
      console.log("remoteYml:", remoteYml);
      this.setState({
        dialog: true,
        remoteYml: remoteYml
      }, () => {
        this.loadRemoteYaml(funFake);
      });
    }
  }

  showDialog(dialog) {
    this.setState({ dialog });
  }

  showGhDialog(ghdialog) {
    this.setState({ ghdialog });
  }

  handleChange(e) {
    this.setState({ remoteYml: e.target.value });
    console.log("handleChange")
  }

  handleGhChange(e) {
    this.setState({ targetRepo: e.target.value });
    console.log("handleGhChange", this.state.targetRepo)
  }

  async loadRemoteYaml(e) {
    e.preventDefault();
    const { onLoad, onReset } = this.props;
    let { remoteYml } = this.state;
    this.showDialog(false);

    if (!remoteYml || !validator.isURL(remoteYml)) {
      this.props.notify({ type: 1, msg: "Not a valid url" });
    }

    let ext = remoteYml.split(/[. ]+/).pop();
    if (ext != "yml" && ext != "yaml") {
      this.props.notify({ type: 1, msg: "File type not supported" });
      return;
    }

    onReset();

    let yaml = null;
    try {
      this.setState({ loading: true });
      this.props.onLoadingRemote(true);

      // piping url to validator which will returns a fresh
      // and validated copy
      yaml = await passRemoteURLToValidator(remoteYml);

      onLoad(yaml);

      this.setState({ loading: false });
      this.props.onLoadingRemote(false);
    } catch (error) {

      this.setState({ loading: false });
      this.props.onLoadingRemote(false);
      this.props.notify({ type: 1, msg: error.message, millis: 10000 });
    }
  }

  load(files) {
    const { onLoad, onReset } = this.props;
    //has dom
    if (!files || !files[0]) {
      this.props.notify({ type: 1, msg: "File not found" });
      return;
    }
    let ext = files[0].name.split(/[. ]+/).pop();
    if (ext != "yml" && ext != "yaml") {
      this.props.notify({ type: 1, msg: "File type not supported" });
      return;
    }

    const reader = new FileReader();
    const that = this;

    onReset();

    reader.onload = function () {
      let yaml = reader.result;
      onLoad(yaml);
      document.getElementById("load_yaml").value = "";
      that.showDialog(false);
    };
    reader.readAsText(files[0]);
  }

  download(data) {
    //has dom
    if (!data || data.length == 0) {
      return;
    }
    const blob = new Blob([data], {
      type: "text/yaml;charset=utf-8;"
    });
    let blobURL = window.URL.createObjectURL(blob);
    let tempLink = document.createElement("a");
    tempLink.style = "display:none";
    tempLink.download = "publiccode.yml";
    tempLink.href = blobURL;
    tempLink.setAttribute("download", "publiccode.yml");
    document.body.appendChild(tempLink);
    tempLink.click();
    setTimeout(function () {
      document.body.removeChild(tempLink);
      window.URL.revokeObjectURL(blobURL);
    }, 1000);
  }

  checkGhAuth() {
    console.log("checkGhAuth")
    if(this.props.authorized !== 'authorized') {
      console.log("need to log in gh")
      this.showGhDialog(true)
    }
  }

  render() {
    let { dialog } = this.state;
    let { ghdialog } = this.state;
    let { yaml, loading, allFields, form } = this.props;
    let errors = null;
    let fail = false;

    if (form && form[APP_FORM]) {
      //was syncErrors
      errors =
        form[APP_FORM] && form[APP_FORM].submitErrors
          ? form[APP_FORM].submitErrors
          : null;
      fail = form[APP_FORM].submitFailed ? form[APP_FORM].submitFailed : false;
    }

    return (
      <div className="sidebar">
        <div className="sidebar__title">
          {fail == true ? "Errors" : "File YAML"}
          {loading && <img src={img_dots} className="loading" />}
        </div>

        <div className="sidebar__body">
          {!fail &&
            !yaml && <div className="sidebar__info">No code generated.</div>}
          {fail &&
            errors && (
              <div className="sidebar__error">
                {Object.keys(errors).map((e, i) => (
                  <div key={i}>
                    <img src={img_x} />
                    {getLabel(allFields, e)}
                  </div>
                ))}
              </div>
            )}
          {!(fail && errors) && (
            <div className="sidebar__code">
              <pre>
                <code>
                  {"\n"}
                  {yaml}
                </code>
              </pre>
            </div>
          )}
        </div>


        {ghdialog && (
          <div className="sidebar__prefooter">
            <div
              className="sidebar__prefooter__close"
              onClick={() => this.showGhDialog(false)}
            >
              <img src={img_xx} alt="close" />
            </div>
            <div className="sidebar__prefooter__content">
              <div>
                <div>Enter the full URL of the GitHub repo you want to add a publiccode.yml file to</div>
                <form
                    onSubmit={e => this.pushToGithub(e)}
                    className="sidebar__prefooter__content__form"
                  >
                    <input
                      className="form-control"
                      type="url"
                      value={this.state.targetRepo}
                      required={true}
                      onChange={e => this.handleGhChange(e)}
                    />
                    <button type="submit" className="btn btn-primary btn-block">
                      <img src={img_gh_pr} alt="push" />Push
                    </button>
                  </form>
              </div>
            </div>
          </div>
        )}




        {dialog && (
          <div className="sidebar__prefooter">
            <div
              className="sidebar__prefooter__close"
              onClick={() => this.showDialog(false)}
            >
              <img src={img_xx} alt="close" />
            </div>
            <input
              id="load_yaml"
              type="file"
              accept=".yml, .yaml"
              style={{ display: "none" }}
              onChange={e => this.load(e.target.files)}
            />
            <div className="sidebar__prefooter__content">
              <div>
                <div>Browse file from disk</div>
                <div className="sidebar__prefooter__content__form">
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={() => document.getElementById("load_yaml").click()}
                  >
                    <img src={img_upload} alt="upload" />Browse
                  </button>
                </div>
              </div>
              <div>
                <div>Paste remote yaml url</div>
                <div>
                  <form
                    onSubmit={e => this.loadRemoteYaml(e)}
                    className="sidebar__prefooter__content__form"
                  >
                    <input
                      className="form-control"
                      type="url"
                      value={this.state.remoteYml}
                      required={true}
                      onChange={e => this.handleChange(e)}
                    />
                    <button type="submit" className="btn btn-primary btn-block">
                      <img src={img_upload} alt="upload" />Load
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="sidebar__footer">
          <div className="sidebar__footer_item">
            <a href="#">
              <img src={img_copy} alt="copy" />
              <span
                className="action"
                onClick={() => {
                  copy(yaml);
                  this.props.notify({
                    type: "info",
                    title: "",
                    msg: "Copied to clipboard"
                  });
                }}
              >
                Copy
              </span>
            </a>
          </div>
          <div className="sidebar__footer_item">
            <a href="#">
              <img src={img_upload} alt="upload" />
              <span className="action" onClick={() => this.showDialog(true)}>
                Upload
              </span>
            </a>
          </div>
          <div className="sidebar__footer_item">
            <a href="#" className={!yaml ? 'disabled' : 'enabled'}>
              <img src={img_download} alt="dowload" />
              <span className="action" onClick={!yaml ? null : () => this.download(yaml)}>
                Download
              </span>
            </a>
          </div>
          <div className="sidebar__footer_item">
            <a href="#" className={!yaml ? 'disabled' : 'enabled'}>
              <img src={img_gh_pr} alt="dowload" />
              {/* <span className="action" onClick={!yaml ? null : () => this.pushToGithub(yaml)}> */}
              {/* <span className="action" onClick={!yaml ? null : () => this.showGhDialog(true)}> */}
              <span className="action" onClick={!yaml ? null : () => this.checkGhAuth()}>
                Github
              </span>
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default sidebar;
