import { v4 as uuid } from 'node-uuid';
import moment from 'moment';


export class ShanghaiTechKnowledgeGraph {
  DBConnector: Object;
  FSConnector: Object;

  constructor({ DBConnector, FSConnector }) {
    this.DBConnector = DBConnector;
    this.FSConnector = FSConnector;
  }

  async createMemePath({title, description}) {
    const result: { uuid: string, title: string, description: string, createTime: string, updateTime: string } = await this.DBConnector.createMemePath({
      uuid: uuid(), title, description, createTime: moment().format('YYYY-MM-DD HH:mm:ss')
    });
    await this.FSConnector.createMemePathFolder({ folderUUID: result.uuid });

    return result;
  }

  getMemePath(uuid) {
    return this.DBConnector.getPropertiesByUniqueProperty({ labels: ['MEMEPATH'], properties: { uuid } });
  }

  getMeme(uuid) {
    return this.DBConnector.getPropertiesByUniqueProperty({ labels: ['MEME'], properties: { uuid } });
  }


  async createStringMeme({ title, description, content, mimeType, memePathUUID }) {

    const fileUUID = uuid();
    const filePath = await this.FSConnector.createMarkdown({ folderUUID: memePathUUID, fileUUID, markdown: content });

    const result: { uuid: string, title: string, description: string, mimeType: string, uri: string, createTime: string, updateTime: string } = await this.DBConnector.createStringMeme({
      uuid: fileUUID, title, description, content, mimeType, uri: filePath, createTime: moment().format('YYYY-MM-DD HH:mm:ss')
    });

    await this.DBConnector.createEdgeBetweenUUID({ memeUUID: fileUUID, memePathUUID, label: 'IMPORTS' });

    result.memePathUUID = memePathUUID;
    return result;
  }

}

