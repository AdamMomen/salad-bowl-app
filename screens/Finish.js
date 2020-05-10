import React, {Component} from 'react';
import { StyleSheet, Text, View, Button, Dimensions } from 'react-native';
import Screens from '../constants/Screens';
import Fire from '../Fire';
import PrimaryButton from '../components/primitives/PrimaryButton';
import { isValidSnapshot } from '../global/GlobalFunctions';

class Finish extends Component {
  state = {
    team1Score: null,
    team2Score: null
  }

  componentDidMount() {
    this.db = Fire.db;

    this.db.getRef(`games/${this.props.gameID}/score`).once('value', (snapshot) => {
      if (!isValidSnapshot(snapshot, 9)) {
        this.props.changeScreen(Screens.HOME);
        return
      }
      let scores = Object.entries(snapshot.val());
      let team1Pts = 0;
      let team2Pts = 0;
      console.log(scores);
      for (let i = 0; i < scores.length; i++) {
        if (scores[i][0] === 'team1') {
          team1Pts = scores[i][1]
        } else if (scores[i][0] === 'team2') {
          team2Pts = scores[i][1]
        }
      }
      this.setState({team1Score: team1Pts, team2Score: team2Pts});
    });

  }

  goHome() {
    this.db.getRef(`players/${this.props.gameID}/${this.props.playerID}`).remove()
    .then(()=> {
      console.log(`${this.props.playerID} (${this.props.screenName}) left game`);
    })
    .catch((error) => 'Failed to leave game: ' + error.message)
    this.props.changeScreen(Screens.HOME);
  }

  render() {
    const { team1Score, team2Score } = this.state;

    let loading = false;
    if (team1Score === null || team2Score === null) {
      loading = true;
    }

    let message = "It's a Tie!";
    if ((this.props.team === 0 && team1Score > team2Score) ||
     (this.props.team === 1 && team2Score > team1Score)) {
      message = "Your Team Won!"
    } else if ((this.props.team === 0 && team1Score < team2Score) ||
    (this.props.team === 1 && team2Score < team1Score)) {
      message = "Your Team Lost!"
    }

    const team1Style = this.props.team === 0 ? null : styles.opposing
    const team2Style = this.props.team === 1 ? null : styles.opposing

    return (
      <View style={styles.container}>
        {loading ? <Text style={styles.message}> Loading... </Text> : 
          <>
            <View style={styles.body}>
              <Text style={styles.message}>{message}</Text> 
              <View style={styles.score}>
                <View style={styles.teamScore}>
                  <Text style={[styles.points, team1Style]}>{team1Score}</Text>
                  <Text style={[styles.team, team1Style]}>Team 1</Text> 
                </View>
                <View style={styles.teamScore}>
                  <Text style={[styles.points, team2Style]}>{team2Score}</Text>
                  <Text style={[styles.team, team2Style]}>Team 2</Text>
                </View>
              </View>
            </View>
            <View style={styles.footer}>
              <PrimaryButton 
                text="Go Home" 
                onPress={() => this.goHome()}
              />
            </View>
          </>
        }
      </View>
    );
  }
}
  
const styles = StyleSheet.create({
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 6,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: Dimensions.get('screen').height/25,
    fontFamily: 'poppins-semibold',
    color: '#fff',
    textAlign: 'center'
  },
  score: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    minWidth: '100%',
    paddingTop: 20,
  },
  teamScore: {
    display: 'flex',
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'column'
  },
  team: {
    fontSize: Dimensions.get('screen').height/50,
    fontFamily: 'poppins-semibold',
    color: '#fff',
  },
  points: {
    fontSize: Dimensions.get('screen').height/20,
    fontFamily: 'poppins-semibold',
    color: '#fff',
  },
  opposing: {
    color: '#ffffff66'
  },
  footer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minWidth: '100%',
  }
});

export default Finish;