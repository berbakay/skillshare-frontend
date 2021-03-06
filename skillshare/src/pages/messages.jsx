import React, { Component } from "react";
import Talk from "talkjs";
import { AuthContext } from "../Auth";
import axios from "axios";
import PropTypes from "prop-types";
import Header from "../components/header";
import firebase from "firebase";

export default class Messages extends Component {
  state = {
    me: {},
  };
  static propTypes = {
    location: PropTypes.object,
  };

  talkjsContainer = React.createRef();

  static contextType = AuthContext;

  componentDidMount() {
    let meImageUrl;
    let otherImageUrl;
    if (!this.props.location.state) {
      this.props.location.state = {
        currentUserUid: this.context.currentUser.uid,
        messagedUser: null,
        messagedUid: null,
        directedFromMessage: false,
      };
    }
    console.log("Messaged User: ", this.props.location.state.messagedUser);
    const {
      currentUserUid,
      directedFromMessage,
      messagedUser,
      messagedUid,
    } = this.props.location.state;
    axios
      .get(
        `https://firebasing-testing.firebaseio.com/users/${currentUserUid}.json`
      )
      .then((res) => {
        this.setState({ me: res.data }, () => {
          console.log("Me:", this.state.me);
        });
      })
      .then(() => {
        return firebase
          .storage()
          .ref(`/users/${currentUserUid}/profile.jpg`)
          .getDownloadURL();
      })
      .then((url) => {
        meImageUrl = url;
        if (messagedUser) {
          return firebase
            .storage()
            .ref(`/users/${messagedUid}/profile.jpg`)
            .getDownloadURL();
        } else {
          return null;
        }
      })
      .then((url) => {
        otherImageUrl = url;
        return Talk.ready;
      })
      .then(() => {
        const { name, email } = this.state.me;
        const me = new Talk.User({
          id: currentUserUid,
          name: name,
          email: email,
          photoUrl: meImageUrl,
          welcomeMessage: `Hi! It's ${name}!`,
          role: "Admin",
        });
        if (!window.talkSession) {
          window.talkSession = new Talk.Session({
            appId: "tF07bX0H",
            me: me,
          });
        }
        if (directedFromMessage) {
          const other = new Talk.User({
            id: messagedUid,
            name: messagedUser.name,
            email: messagedUser.email,
            photoUrl: otherImageUrl,
            welcomeMessage: `Hi! It's ${messagedUser.name}`,
            role: "Admin",
          });
          const conversationId = Talk.oneOnOneId(me, other);
          const conversation = window.talkSession.getOrCreateConversation(
            conversationId
          );
          conversation.setParticipant(me);
          conversation.setParticipant(other);
          var inbox = window.talkSession.createInbox({
            selected: conversation,
          });
          inbox.mount(this.talkjsContainer.current);
        } else {
          var inbox = window.talkSession.createInbox();
          inbox.mount(this.talkjsContainer.current);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }

  destroySession = () => {
    window.talkSession.destroy();
  };

  render() {
    return (
      <>
        <Header />
        <div className="buffer-messages"></div>
        <div className="chatbox-container" ref={this.talkjsContainer}></div>
      </>
    );
  }
}
