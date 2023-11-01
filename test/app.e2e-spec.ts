import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import * as pactum from 'pactum';
import { AuthDto } from 'src/auth/dto';
import { EditUserDto } from 'src/user/dto';

describe('App e2e', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    await app.listen(3333);

    prismaService = app.get(PrismaService);
    await prismaService.cleanDb();
    pactum.request.setBaseUrl('http://localhost:3333');
  });

  afterAll(() => app.close());

  describe('Auth', () => {
    const dto: AuthDto = {
      email: 'test@test.com',
      password: 'testsecret',
    };
    describe('Signup', () => {
      const signupUrl = '/auth/signup';
      it('should throw an error if email is missing', () => {
        return pactum
          .spec()
          .post(signupUrl)
          .withBody({ password: dto.password })
          .expectStatus(400);
      });

      it('should throw an error if password is missing', () => {
        return pactum
          .spec()
          .post(signupUrl)
          .withBody({ email: dto.email })
          .expectStatus(400);
      });

      it('should throw if no DTO', () => {
        return pactum.spec().post(signupUrl).withBody({}).expectStatus(400);
      });

      it('should signup user', () => {
        return pactum.spec().post(signupUrl).withBody(dto).expectStatus(201);
      });
    });

    describe('Signin', () => {
      const signinUrl = '/auth/signin';

      it('should throw an error if email is missing', () => {
        return pactum
          .spec()
          .post(signinUrl)
          .withBody({ password: dto.password })
          .expectStatus(400);
      });

      it('should throw an error if password is missing', () => {
        return pactum
          .spec()
          .post(signinUrl)
          .withBody({ email: dto.email })
          .expectStatus(400);
      });

      it('should throw if no DTO', () => {
        return pactum.spec().post(signinUrl).withBody({}).expectStatus(400);
      });

      it('should signin user', () => {
        return pactum
          .spec()
          .post(signinUrl)
          .withBody(dto)
          .expectStatus(200)
          .stores('userAccessToken', 'access_token');
      });
    });
  });

  describe('User', () => {
    const usersUrl = '/users';
    describe('Get me', () => {
      it('should get current user', () => {
        return pactum
          .spec()
          .get(`${usersUrl}/me`)
          .withBearerToken(`$S{userAccessToken}`)
          .expectStatus(200);
      });
    });
    describe('Edit user', () => {
      it('should edit user', () => {
        const dto: EditUserDto = {
          firstName: 'Lnb',
          email: 'lnb@gmail.com',
        };

        return pactum
          .spec()
          .patch(`${usersUrl}`)
          .withBearerToken(`$S{userAccessToken}`)
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.firstName)
          .expectBodyContains(dto.email);
      });
    });
  });

  describe('Bookmark', () => {
    describe('Create bookmark', () => {});
    describe('Get bookmarks', () => {});
    describe('Get bookmark by id', () => {});
    describe('Edit bookmark by id', () => {});
    describe('Delete bookmark by id', () => {});
  });
});
