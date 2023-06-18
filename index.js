
// --------- Partie setup --------- //


const express = require('express');
const fs = require('fs');
const xml2js = require('xml2js');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();
require('dotenv').config({ path: 'mdp.env' });
const port = process.env.PORT;
const corsdomains = process.env.CORSDOMAINS.split(",");


app.use(cors({
	origin: corsdomains,
	optionsSuccessStatus: 200 // For legacy browser support
}));


const db = mysql.createPool({
	host: process.env.HOST,
	user: process.env.USER,
	password: process.env.PASSWORD,
	database: process.env.DATABASE,
	port: process.env.PORTDB,
});


app.listen(port, () => { console.log("Server started at port", port); });

// --------- Partie intéraction --------- //

//Fonction principale pour retourner les jeux
app.get("/gamelist", (req, res) => {
	const request = req.query.filter;
	let sql = `SELECT * FROM wiigames ORDER BY title;`;
	if (request === 'games-owned') { sql = `SELECT * FROM wiigames WHERE owned = true ORDER BY title;`; }
	if (request === 'games-not-owned') { sql = `SELECT * FROM wiigames WHERE owned = false ORDER BY title;`; }
	db.query(sql, (err, data) => {
		if (err) res.status(500).send({ error: err });
		res.status(200).send(data);
	});
});


//Fonction qui permet de savoir combien de jeu nous avons
app.get('/howmanygameowned', (req, res) => {
	db.query(`SELECT COUNT(*) FROM wiigames WHERE owned = true`, (err, row) => {
		if (err) res.status(500).send({ error: err });
		res.status(200).send({ count: row[0]['COUNT(*)'] });
	});
});


// Fonction qui permet de vérifier si le jeu est possédé ou non pour l'affichage HTML
app.get('/jeuxpossedes', (req, res) => {
	const gameID = req.query.gameID; // Récupérer l'ID du jeu depuis la requête
	db.query(`SELECT owned FROM wiigames WHERE id = ?;`, [gameID], (err, row) => {
		if (err || !row.length) { // Check for empty array
			res.status(500).send({ error: err });
		} else {
			if (row[0].owned === 1) {
				res.status(200).send({ result: true });
			} else {
				res.status(200).send({ result: false });
			}
		}
	});
});


// Fonction qui permet d'ajouter un jeu ou le supprimer
app.get('/ajoutsuppr', (req, res) => {
	if (req.query.password !== process.env.MDP) { res.status(401).send({ error: "unauthorized" }); }
	const gameID = req.query.gameID; // Récupérer l'ID du jeu depuis la requête
	db.query(`SELECT owned FROM wiigames WHERE id = ?;`, [gameID], (err, row) => {
		if (err) {
			console.error('Erreur lors de l\'exécution de la requête :', err.message);
		} else {
			if (row[0].owned === 1) {
				db.query(`UPDATE wiigames SET owned = 0 WHERE id = ?;`, [gameID], (err) => {
					if (err) return console.error("Error during deleting game owned to database: ", err.message);
				});
				res.status(200).send({ result: true });
			} else {
				db.query(`UPDATE wiigames SET owned = 1 WHERE id = ?;`, [gameID], (err) => {
					if (err) return console.error("Error during inserting game owned to database: ", err.message);
				});
				res.status(200)({ result: false });
			}
		}
	});
});