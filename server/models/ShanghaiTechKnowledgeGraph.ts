type connectors = {
  DBConnector: Object,
  FSConnector: Object
}

export default class ShanghaiTechKnowledgeGraph {
  DBConnector: Object;
  FSConnector: Object;

  constructor({ DBConnector, FSConnector }: connectors) {
    this.DBConnector = DBConnector;
    this.FSConnector = FSConnector;
  }

}
