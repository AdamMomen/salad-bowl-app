import React, {Component} from 'react';
import { StyleSheet, Text, View, Button, TextInput } from 'react-native';
import Screens from '../constants/Screens';
import Fire from '../Fire';
import _ from 'lodash';

class Lobby extends Component {
  state = {
    editWords: true,
    error: '',
    players: [['','']],
    waitingPlayerKeys: [],
    words: [{key: '', word: ''}, {key: '', word: ''}],
    wordCount: 0,
  }

  componentDidMount() {
    this.db = Fire.db;

    // Add player to the list of players for the game
    this.db.getRef('players/' + this.props.gameID).push(this.props.screenName)
      .then((value) => {
        this.props.setPlayerID(value.key)
        // Add player to 'waiting' state to indicate (to others) they haven't submitted words
        this.db.getRef(`games/${this.props.gameID}/waiting/${value.key}`).set(this.props.screenName);
      });

    // Listen for any players that have been added to the game  
    this.db.getRef('players/' + this.props.gameID).on('value', (snapshot) => {
      let dbPlayers = _.toPairs(snapshot.val());
      this.setState({players: [...dbPlayers]});  
    });
    
    // Listen for words submitted (used for count)
    this.db.getRef('words/' + this.props.gameID).on('value', (snapshot) => {
      let words = _(snapshot.val()).values();
      let count = [...words].length;
      this.setState({wordCount: count});
    });

    // Listen for players in 'waiting' state
    this.db.getRef(`games/${this.props.gameID}/waiting`).on('value', (snapshot) => {
      let waiting = _(snapshot.val()).keys();
      this.setState({waitingPlayerKeys: [...waiting]});
    });
  }

  async componentWillUnmount() {
    this.db.getRef('players/' + this.props.gameID).off();
    this.db.getRef('words/' + this.props.gameID).off();
    this.db.getRef(`games/${this.props.gameID}/waiting`).off();
  }

  async goHome() {
    // Remove player from player list for game
    this.db.getRef(`players/${this.props.gameID}/${this.props.playerID}`).remove()
    .then(()=> {
      console.log(`${this.props.playerID} (${this.props.screenName}) was removed from the game`);
      this.removeUserWaiting();
      this.removeUserWords();
      this.checkIfLastToLeave();
    })
    .catch((error) => 'Remove failed: ' + error.message)
    .finally(()=> {
      this.props.setPlayerID('');
      this.props.updateGameID('');
      this.props.changeScreen(Screens.HOME)
    });
  }

  async removeUserWaiting() {
    this.db.getRef(`games/${this.props.gameID}/waiting/${this.props.playerID}`).remove()
    .then(()=> {
      console.log(`${this.props.playerID} (${this.props.screenName}) was removed from waiting`);
    })
    .catch((error) => 'Remove from waiting failed: ' + error.message)
  }

  // Remove the words the user submitted
  async removeUserWords() {
    let currentWords = this.state.words;
    for (let i = 0; i < currentWords.length; i++) {
      this.db.getRef(`words/${this.props.gameID}/${currentWords[i].key}`).remove()
      .then(()=> {
        console.log(`Removed word (${currentWords[i].word}) from game`);
      })
      .catch((error) => 'Word remove failed: ' + error.message)
    }
  }

  // Check if we were the last person to leave the game
  async checkIfLastToLeave() {
    this.db.getRef(`players`).orderByKey().equalTo(this.props.gameID).once('value', (snapshot) => {
      if (snapshot.val() == null) {
        console.log(`${this.props.screenName} WAS the last player to leave`);
        this.deleteGame();
        this.deleteGameWords();
      }
    }); 
  }

  // Delete the game we just left
  async deleteGame() {
    this.db.getRef(`games/${this.props.gameID}`).remove()
    .then(()=> {
      console.log(`Game (${this.props.gameID}) was deleted`);
    })
    .catch((error) => 'Game deletion failed: ' + error.message);  
  }

  // Delete words that are for the current game
  async deleteGameWords() {
    this.db.getRef(`words/${this.props.gameID}`).remove()
    .then(()=> {
      console.log(`Words for game (${this.props.gameID}) were deleted`);
    })
    .catch((error) => 'Words deletion failed: ' + error.message); 
  }

  updateWord(text, index) {
    this.setState(prevState => {
      let newWords = [...prevState.words];
      newWords[index].word = text;
      return {words: newWords};
    });
  }

  submitWords() {
    for (let i = 0; i < this.state.words.length; i++) {
      if (this.state.words[i].word.trim() === '') {
        this.setState({error: "Cannot submit invalid words"});
        return;
      }
    }
    this.setState({error: ''});
    if (this.state.words[0].key !== '') { // Update words in database
      for (let i = 0; i < this.state.words.length; i++) {
        this.db.getRef(`words/${this.props.gameID}`)
        .update({
          [this.state.words[i].key]: this.state.words[i].word.trim().toUpperCase()
        });
      }
    } else { // Add words to database
      let gameWordsRef = this.db.getRef('words/' + this.props.gameID);
      for (let i = 0; i < this.state.words.length; i++) {
        let wordRef = gameWordsRef.push(this.state.words[i].word.trim().toUpperCase());
        this.setState(prevState => {
          let newWords = [...prevState.words];
          newWords[i].key = wordRef.key;
          return {words: newWords};
        })
      }
      this.db.getRef(`games/${this.props.gameID}/waiting/${this.props.playerID}`).remove()
      .then(()=> 
      console.log(`No longer waiting for ${this.props.playerID} (${this.props.screenName}) to submit words`))
    }
    this.setState({editWords: false});
    this.setState((prevState) => {
      let newWords = [...prevState.words];
      for (let i = 0; i < newWords.length; i++) {
        newWords[i].word = newWords[i].word.trim()
      }
      return {
        editWords: false,
        words: newWords
      }
    })
  }

  startGame() {

  }

  render() {
    let playerList = this.state.players.map((player, i)=>{
      let prefix = this.state.waitingPlayerKeys.includes(player[0]) ? '*' : '';
      return(<Text key={i}>{prefix}{player[1]}</Text>);
    });

    let yourWords = this.state.editWords ? 
      (<>
        <Text>{this.state.error}</Text> 
        <TextInput 
          style={styles.textInput}
          autoCompleteType={"off"}
          autoCorrect={false}
          onChangeText={text=>this.updateWord(text, 0)}
          placeholder={"Enter Your First Word"}
          value={this.state.words[0].word}
        />
        <TextInput 
          style={styles.textInput}
          autoCompleteType={"off"}
          autoCorrect={false}
          onChangeText={text=>this.updateWord(text, 1)}
          placeholder={"Enter Your Second Word"}
          value={this.state.words[1].word}
        />
        <Button title="Submit Words" onPress={()=>this.submitWords()}/>
      </>) 
      :
      (<>
        {this.state.words.map((wordObject) => {
          return (<Text key={wordObject.key}>{wordObject.word}</Text>)
        })}
        <Button title="Edit" onPress={()=>this.setState({editWords: true})}/>
      </>)


    return (
      <View style={styles.container}>
        <Text>Lobby Game Screen</Text> 
        <Text>Game ID: {this.props.gameID}</Text> 
        {yourWords}
        {/* Note that currently it is possible for the submitted word count
        to be greater than the total word count that needs to be hit */}
        <Text>{this.state.wordCount}/{this.state.players.length*2} words submitted</Text>
        <Button 
          title="Start Game!" 
          disabled={this.state.wordCount < this.state.players.length*2}
          onPress={()=>this.startGame()}
        />
        <Text>Players</Text>
        {playerList}
        <Button title="Leave" onPress={()=>this.goHome()}/> 
      </View>
    );
  }
}
  
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    borderColor: 'gray',
    borderRadius: 10,
    borderWidth: 1,
    height: 40,
    margin: 5,
    padding: 4,
    width: 200
  }
});

  export default Lobby;