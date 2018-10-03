import chai, { expect } from 'chai';
import chaiHttp from 'chai-http';
import { app } from '../server';
import resetDB from '../helpers/resetDB';

const should = chai.should();

chai.use(chaiHttp);

describe('Authentication controller', () => {
  after((done) => {
    resetDB.resetDB();

    done();
  });

	describe('Signup a new user', () => {
		it('POST to /auth/signup should create a user successfully', done => {
			chai
				.request(app)
        .post('/api/auth/signup')
        .send({
        	"firstname": "Adinoyi",
        	"lastname": "Sadiq",
          "email": "adinoyi@gmail.com",
          "password": "myPassword"
        })
        .end((err, res) => {
          expect(res.status).to.equal(201);
          expect(res.body.token).to.be.a('string');
          done();
        });
		})

    it('Should return an error message when the user tries to sign up with an already existing email', done => {
      chai
        .request(app)
        .post('/api/auth/signup')
        .send({
          "firstname": "Adinoyi",
          "lastname": "Sadiq",
          "email": "adinoyi@gmail.com",
          "password": "myPassword"
        })
        .end((err, res) => {
          expect(res.status).to.equal(400);
          expect(res.body.message).to.equal('Email is in use');
          done();
        });
    });

    it('Should return an error message when the user tries to sign up with no data', done => {
      chai
        .request(app)
        .post('/api/auth/signup')
        .send({
          "firstname": "",
          "lastname": "",
          "email": "",
          "password": ""
        })
        .end((err, res) => {
          expect(res.status).to.equal(400);
          expect(res.body.message).to.equal('Please fill the firstname, lastname, email, and password fields');
          done();
        });
    });

    it('Should return an error message when the user tries to sign up with a missing field', done => {
      chai
        .request(app)
        .post('/api/auth/signup')
        .send({
          "firstname": "Adinoyi",
          "lastname": "Sadiq",
          "email": "",
          "password": "myPassword"
        })
        .end((err, res) => {
          expect(res.status).to.equal(400);
          expect(res.body.message).to.equal('Please fill the email field');
          done();
        });
    });

    it('Should return an error message when the user tries to sign up after passing more than the required fields', done => {
      chai
        .request(app)
        .post('/api/auth/signup')
        .send({
          "firstname": "Adinoyi",
          "lastname": "Sadiq",
          "email": "myemail@gmail.com",
          "password": "password",
          "occupation": "Software developer"
        })
        .end((err, res) => {
          expect(res.status).to.equal(400);
          expect(res.body.message).to.equal('Too many fields');
          done();
        });
    });
	});

  describe('Signin a new user', () => {
    beforeEach((done) => {
      chai
        .request(app)
        .post('/api/auth/signup')
        .send({
          "firstname": "Adinoyi",
          "lastname": "Sadiq",
          "email": "sadiqadinoyi@gmail.com",
          "password": "myPassword"
        })
        .end((err, res) => {
          done();
        });
    });

    it('POST should create an authenticate a user using username and password', done => {
      chai
        .request(app)
        .post('/api/auth/signin')
        .send({
          "email": "sadiqadinoyi@gmail.com",
          "password": "myPassword"
        })
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body.token).to.be.a('string');
          done();
        });
    });
  });
});